"""Business logic for wallet payments (parking sessions + owner subscriptions)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.constants import PaymentStatus, RoleName, SessionStatus, SubscriptionStatus
from app.core.exceptions import BadRequestException, ForbiddenException
from app.models.car import Car
from app.models.owner_subscription import OwnerSubscription
from app.models.parking_session import ParkingSession
from app.models.payment import Payment
from app.models.user import User
from app.repositories.car_repository import CarRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.payment_repository import PaymentRepository
from app.schemas.payment import PaymentConfirmRequest
from app.services.subscription_service import SubscriptionService
from app.services.wallet_payment_client import WalletPaymentClient


def _new_reference() -> str:
    prefix = settings.WALLET_REFERENCE_PREFIX or "PP"
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


class PaymentService:
    def __init__(self, db: Session, wallet_client: WalletPaymentClient):
        self.db = db
        self.wallet_client = wallet_client
        self.payment_repo = PaymentRepository(db)
        self.car_repo = CarRepository(db)
        self.customer_repo = CustomerRepository(db)

    # ─── helpers ──────────────────────────────────────────────────────────────

    def _require_phone(self, phone: str | None) -> str:
        if not phone or not phone.strip():
            raise BadRequestException(
                "A phone number is required to pay with your wallet. "
                "Please add your phone number to your profile."
            )
        return phone.strip()

    def _pending_payment(
        self,
        session_id: int | None = None,
        subscription_id: int | None = None,
    ) -> Payment | None:
        stmt = select(Payment).where(Payment.status == PaymentStatus.PENDING.value)
        if session_id is not None:
            stmt = stmt.where(Payment.session_id == session_id)
        if subscription_id is not None:
            stmt = stmt.where(Payment.subscription_id == subscription_id)
        return self.db.scalars(stmt.order_by(Payment.id.desc()).limit(1)).first()

    def _confirm(self, payment: Payment, payload: PaymentConfirmRequest) -> None:
        try:
            result = self.wallet_client.confirm(
                payment.wallet_payment_id, payload.otp_code, payload.pin
            )
        except BadRequestException as exc:
            payment.message = exc.message
            self.db.commit()
            raise
        payment.status = PaymentStatus.COMPLETED.value
        payment.wallet_transaction_id = result.get("id")
        payment.paid_at = datetime.now(timezone.utc)
        payment.message = "Payment completed."
        self.db.commit()

    # ─── Parking session payments ────────────────────────────────────────────

    def _assert_session_access(self, session: ParkingSession, current_user: User) -> None:
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            car = self.car_repo.get(session.car_id)
            if not customer or not car or car.customer_id != customer.id:
                raise ForbiddenException("You can only pay for your own parking sessions.")
        elif current_user.role.name not in (
            RoleName.ADMIN.value,
            RoleName.OWNER.value,
            RoleName.STAFF.value,
        ):
            raise ForbiddenException("You do not have permission to pay for this session.")

    def _session_customer_phone(self, session: ParkingSession) -> str:
        car = self.car_repo.get(session.car_id)
        if not car:
            raise ForbiddenException("Car not found for this session.")
        customer = car.customer if car.customer else None
        user = customer.user if customer else None
        return self._require_phone(user.phone if user else None)

    def initiate_session_payment(self, session: ParkingSession, current_user: User) -> Payment:
        self._assert_session_access(session, current_user)
        if session.status != SessionStatus.PENDING.value:
            raise BadRequestException("Only PENDING sessions can be paid.")
        if session.fee is None or session.fee <= 0:
            raise BadRequestException("This session has no fee to pay.")

        existing = self._pending_payment(session_id=session.id)
        if existing:
            return existing

        phone = self._session_customer_phone(session)
        reference = _new_reference()
        result = self.wallet_client.initiate(
            customer_phone=phone,
            amount=session.fee,
            reference=reference,
            description=f"Parking session #{session.id}",
        )

        amount = float(result.get("amount", session.fee))
        fee = float(result.get("fee", 0.0))
        total = float(result.get("total", round(amount + fee, 2)))

        payment = Payment(
            user_id=current_user.id,
            session_id=session.id,
            wallet_payment_id=result.get("payment_id"),
            amount=amount,
            fee=fee,
            total=total,
            reference=reference,
            status=PaymentStatus.PENDING.value,
            message=result.get("message"),
        )
        return self.payment_repo.create(payment)

    def confirm_session_payment(
        self,
        session: ParkingSession,
        payload: PaymentConfirmRequest,
        current_user: User,
    ) -> tuple[Payment, ParkingSession]:
        self._assert_session_access(session, current_user)
        if session.status != SessionStatus.PENDING.value:
            raise BadRequestException("Only PENDING sessions can be paid.")

        payment = self._pending_payment(session_id=session.id)
        if not payment or not payment.wallet_payment_id:
            raise BadRequestException("Please initiate the payment first.")

        self._confirm(payment, payload)

        session.status = SessionStatus.ACTIVE.value
        self.db.commit()
        self.db.refresh(payment)
        return payment, session

    # ─── Subscription payments ───────────────────────────────────────────────

    def _assert_subscription_access(
        self, subscription: OwnerSubscription, current_user: User
    ) -> None:
        if current_user.role.name == RoleName.ADMIN.value:
            return
        if current_user.role.name != RoleName.OWNER.value:
            raise ForbiddenException("Only the owner or an admin can pay for this subscription.")
        if subscription.owner.user_id != current_user.id:
            raise ForbiddenException("You can only pay for your own subscriptions.")

    def _subscription_owner_phone(self, subscription: OwnerSubscription) -> str:
        owner = subscription.owner
        user = owner.user if owner else None
        return self._require_phone(user.phone if user else None)

    def initiate_subscription_payment(
        self, subscription: OwnerSubscription, current_user: User
    ) -> Payment:
        self._assert_subscription_access(subscription, current_user)
        if subscription.status != SubscriptionStatus.PENDING.value:
            raise BadRequestException("Only PENDING subscriptions can be paid.")

        existing = self._pending_payment(subscription_id=subscription.id)
        if existing:
            return existing

        phone = self._subscription_owner_phone(subscription)
        reference = _new_reference()
        result = self.wallet_client.initiate(
            customer_phone=phone,
            amount=subscription.amount,
            reference=reference,
            description=f"Parking subscription #{subscription.id}",
        )

        amount = float(result.get("amount", subscription.amount))
        fee = float(result.get("fee", 0.0))
        total = float(result.get("total", round(amount + fee, 2)))

        payment = Payment(
            user_id=current_user.id,
            subscription_id=subscription.id,
            wallet_payment_id=result.get("payment_id"),
            amount=amount,
            fee=fee,
            total=total,
            reference=reference,
            status=PaymentStatus.PENDING.value,
            message=result.get("message"),
        )
        return self.payment_repo.create(payment)

    def confirm_subscription_payment(
        self,
        subscription: OwnerSubscription,
        payload: PaymentConfirmRequest,
        current_user: User,
    ) -> tuple[Payment, OwnerSubscription]:
        self._assert_subscription_access(subscription, current_user)
        if subscription.status != SubscriptionStatus.PENDING.value:
            raise BadRequestException("Only PENDING subscriptions can be paid.")

        payment = self._pending_payment(subscription_id=subscription.id)
        if not payment or not payment.wallet_payment_id:
            raise BadRequestException("Please initiate the payment first.")

        self._confirm(payment, payload)

        SubscriptionService(self.db).activate_paid_subscription(subscription)
        return payment, subscription
