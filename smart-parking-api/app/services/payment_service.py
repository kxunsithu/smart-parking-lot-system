"""Business logic for digital wallet payments (parking sessions + owner subscriptions).

Money flow:
- Parking session fee   → charged to the customer's wallet, received by the lot OWNER's wallet.
- Subscription fee      → charged to the owner's wallet,  received by the platform ADMIN's wallet.

The receiver is defined by a WalletAccount that stores the external-system API key
registered in the digital wallet backend. If the required account is missing the
payment cannot be initiated.

Transaction records: a Payment (transaction) record is ONLY created once the
external wallet confirms the payment is completed. Initiated but unfinished
payments are tracked in PendingWalletPayment instead, so no transaction record
exists until everything is complete. The receiver's phone number is resolved
from the receiving account's API key via the wallet's system-info endpoint.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.config.settings import settings
from app.core.constants import PaymentStatus, RoleName, SessionStatus, SubscriptionStatus
from app.core.exceptions import BadRequestException, ForbiddenException
from app.models.car import Car
from app.models.customer import Customer
from app.models.owner_subscription import OwnerSubscription
from app.models.package import Package
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.payment import Payment
from app.models.pending_payment import PendingWalletPayment
from app.models.user import User
from app.models.wallet_account import WalletAccount
from app.repositories.car_repository import CarRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.pending_payment_repository import PendingWalletPaymentRepository
from app.repositories.wallet_account_repository import WalletAccountRepository
from app.schemas.common import Meta, PaginationParams, build_meta
from app.schemas.payment import PaymentConfirmRequest, PaymentListOut
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
        self.pending_repo = PendingWalletPaymentRepository(db)
        self.account_repo = WalletAccountRepository(db)
        self.car_repo = CarRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)

    # ─── helpers ──────────────────────────────────────────────────────────────

    def _require_phone(self, phone: str | None) -> str:
        if not phone or not phone.strip():
            raise BadRequestException(
                "A phone number is required to pay with your wallet. "
                "Please add your phone number to your profile or pass wallet_phone."
            )
        return phone.strip()

    def _wallet_callback_url(self, app: str) -> str:
        """Where the wallet hosted page redirects the browser after OTP/PIN is entered.

        The wallet appends `reference`, `order_reference`, `status` and `message`
        query params to this URL; the `app` hint lets the callback pick the correct
        frontend even when the payment cannot be found locally.
        """
        base = settings.WALLET_REDIRECT_BASE_URL.rstrip("/")
        return f"{base}/api/v1/wallet-payment/callback?app={app}"

    def _redirect_app_url(
        self, session_id: int | None = None, subscription_id: int | None = None
    ) -> str:
        """Frontend result page the browser is redirected to after the callback finalizes."""
        base = settings.CUSTOMER_APP_URL if session_id is not None else settings.MANAGEMENT_APP_URL
        return f"{base.rstrip('/')}/wallet-payment/result"

    def _require_account(self, account: WalletAccount | None, who: str) -> WalletAccount:
        if not account:
            raise BadRequestException(
                f"{who} has not set up their digital wallet payment account yet. "
                "Please ask them to add their wallet API key before payments can be processed."
            )
        if not account.is_active:
            raise BadRequestException("The receiving wallet payment account is inactive.")
        return account

    def _pending_payment(
        self,
        session_id: int | None = None,
        subscription_id: int | None = None,
    ) -> PendingWalletPayment | None:
        stmt = select(PendingWalletPayment)
        if session_id is not None:
            stmt = stmt.where(PendingWalletPayment.session_id == session_id)
        if subscription_id is not None:
            stmt = stmt.where(PendingWalletPayment.subscription_id == subscription_id)
        return self.db.scalars(stmt.order_by(PendingWalletPayment.id.desc()).limit(1)).first()

    def _account_for_pending(self, pending: PendingWalletPayment) -> WalletAccount:
        return self._require_account(
            self.account_repo.get(pending.wallet_account_id), "The receiving party"
        )

    def _receiver_phone_from_api_key(self, account: WalletAccount) -> str | None:
        """Resolve the receiver phone number from the account's API key.

        The wallet's system-info endpoint returns the registered agent's wallet
        phone for the API key. Falls back to the locally stored wallet_phone so a
        completed payment is never lost if the wallet is temporarily unreachable.
        """
        try:
            info = self.wallet_client.resolve_api_key(account.api_key)
        except BadRequestException:
            info = {}
        phone = info.get("wallet_phone") if isinstance(info, dict) else None
        phone = str(phone).strip() if phone else ""
        return phone or account.wallet_phone or None

    def _complete_payment(
        self, pending: PendingWalletPayment, account: WalletAccount, transaction_number: str
    ) -> Payment:
        """Create the transaction record once the wallet confirms completion.

        Also activates the parent entity (PENDING session → ACTIVE, PENDING
        subscription → ACTIVE) and removes the pending payment tracking row.
        """
        payment = Payment(
            user_id=pending.user_id,
            wallet_account_id=pending.wallet_account_id,
            session_id=pending.session_id,
            subscription_id=pending.subscription_id,
            reference=pending.reference,
            wallet_payment_reference=pending.wallet_payment_reference,
            wallet_payment_url=pending.wallet_payment_url,
            wallet_transaction_number=str(transaction_number or ""),
            receiver_phone=self._receiver_phone_from_api_key(account),
            amount=pending.amount,
            fee=pending.fee,
            total=pending.total,
            status=PaymentStatus.COMPLETED.value,
            message="Payment completed.",
            paid_at=datetime.now(timezone.utc),
        )
        self.db.add(payment)
        self.db.delete(pending)

        if pending.session_id is not None:
            session = self.db.get(ParkingSession, pending.session_id)
            if session and session.status == SessionStatus.PENDING.value:
                session.status = SessionStatus.ACTIVE.value
        elif pending.subscription_id is not None:
            subscription = self.db.get(OwnerSubscription, pending.subscription_id)
            if subscription and subscription.status == SubscriptionStatus.PENDING.value:
                SubscriptionService(self.db).activate_paid_subscription(subscription)

        self.db.commit()
        self.db.refresh(payment)
        return payment

    def _confirm(self, pending: PendingWalletPayment, payload: PaymentConfirmRequest) -> Payment:
        account = self._account_for_pending(pending)
        try:
            result = self.wallet_client.confirm(
                pending.wallet_payment_reference,
                payload.otp_code,
                payload.pin,
                api_key=account.api_key,
            )
        except BadRequestException as exc:
            pending.message = exc.message
            self.db.commit()
            raise
        transaction_number = str(result.get("transaction_number") or result.get("id") or "")
        return self._complete_payment(pending, account, transaction_number)

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

    def _session_receiver_account(self, session: ParkingSession) -> WalletAccount:
        slot = session.slot
        if not slot:
            raise BadRequestException("This session has no parking slot.")
        floor = slot.floor
        lot = floor.parking_lot if floor else None
        owner_id = lot.owner_id if lot else None
        if not owner_id:
            raise BadRequestException("This session has no parking owner to receive the payment.")
        return self._require_account(
            self.account_repo.get_by_owner_id(owner_id), "The parking owner"
        )

    def _session_customer_phone(self, session: ParkingSession) -> str:
        car = self.car_repo.get(session.car_id)
        if not car:
            raise BadRequestException("Car not found for this session.")
        customer = car.customer if car.customer else None
        user = customer.user if customer else None
        return self._require_phone(user.phone if user else None)

    def initiate_session_payment(
        self,
        session: ParkingSession,
        current_user: User,
        wallet_phone: str | None = None,
    ) -> PendingWalletPayment:
        self._assert_session_access(session, current_user)
        if session.status != SessionStatus.PENDING.value:
            raise BadRequestException("Only PENDING sessions can be paid.")
        if session.fee is None or session.fee <= 0:
            raise BadRequestException("This session has no fee to pay.")

        existing = self._pending_payment(session_id=session.id)
        if existing:
            return existing

        receiver = self._session_receiver_account(session)
        phone = self._require_phone(wallet_phone) if wallet_phone else self._session_customer_phone(session)
        reference = _new_reference()
        result = self.wallet_client.initiate(
            customer_phone=phone,
            amount=session.fee,
            order_reference=reference,
            description=f"Parking session #{session.id}",
            redirect_url=self._wallet_callback_url("customer"),
            api_key=receiver.api_key,
        )

        amount = float(result.get("amount", session.fee))
        fee = float(result.get("fee", 0.0))
        total = float(result.get("total", round(amount + fee, 2)))

        pending = PendingWalletPayment(
            user_id=current_user.id,
            wallet_account_id=receiver.id,
            session_id=session.id,
            wallet_payment_reference=result.get("payment_reference"),
            wallet_payment_url=result.get("payment_url"),
            amount=amount,
            fee=fee,
            total=total,
            reference=reference,
            message=result.get("message"),
        )
        return self.pending_repo.create(pending)

    def confirm_session_payment(
        self,
        session: ParkingSession,
        payload: PaymentConfirmRequest,
        current_user: User,
    ) -> tuple[Payment, ParkingSession]:
        self._assert_session_access(session, current_user)
        if session.status != SessionStatus.PENDING.value:
            raise BadRequestException("Only PENDING sessions can be paid.")

        pending = self._pending_payment(session_id=session.id)
        if not pending or not pending.wallet_payment_reference:
            raise BadRequestException("Please initiate the payment first.")

        payment = self._confirm(pending, payload)
        self.db.refresh(session)
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

    def _subscription_owner_phone(
        self, subscription: OwnerSubscription, wallet_phone: str | None
    ) -> str:
        if wallet_phone:
            return self._require_phone(wallet_phone)
        owner = subscription.owner
        user = owner.user if owner else None
        return self._require_phone(user.phone if user else None)

    def initiate_subscription_payment(
        self,
        subscription: OwnerSubscription,
        current_user: User,
        wallet_phone: str | None = None,
    ) -> PendingWalletPayment:
        self._assert_subscription_access(subscription, current_user)
        if subscription.status != SubscriptionStatus.PENDING.value:
            raise BadRequestException("Only PENDING subscriptions can be paid.")

        existing = self._pending_payment(subscription_id=subscription.id)
        if existing:
            return existing

        receiver = self._require_account(
            self.account_repo.get_platform_account(), "The platform administrator"
        )
        phone = self._subscription_owner_phone(subscription, wallet_phone)
        reference = _new_reference()
        result = self.wallet_client.initiate(
            customer_phone=phone,
            amount=subscription.amount,
            order_reference=reference,
            description=f"Parking subscription #{subscription.id}",
            redirect_url=self._wallet_callback_url("management"),
            api_key=receiver.api_key,
        )

        amount = float(result.get("amount", subscription.amount))
        fee = float(result.get("fee", 0.0))
        total = float(result.get("total", round(amount + fee, 2)))

        pending = PendingWalletPayment(
            user_id=current_user.id,
            wallet_account_id=receiver.id,
            subscription_id=subscription.id,
            wallet_payment_reference=result.get("payment_reference"),
            wallet_payment_url=result.get("payment_url"),
            amount=amount,
            fee=fee,
            total=total,
            reference=reference,
            message=result.get("message"),
        )
        return self.pending_repo.create(pending)

    def confirm_subscription_payment(
        self,
        subscription: OwnerSubscription,
        payload: PaymentConfirmRequest,
        current_user: User,
    ) -> tuple[Payment, OwnerSubscription]:
        self._assert_subscription_access(subscription, current_user)
        if subscription.status != SubscriptionStatus.PENDING.value:
            raise BadRequestException("Only PENDING subscriptions can be paid.")

        pending = self._pending_payment(subscription_id=subscription.id)
        if not pending or not pending.wallet_payment_reference:
            raise BadRequestException("Please initiate the payment first.")

        payment = self._confirm(pending, payload)
        self.db.refresh(subscription)
        return payment, subscription

    # ─── Hosted payment callback ─────────────────────────────────────────────

    def find_pending_for_callback(
        self, order_reference: str | None, wallet_reference: str | None
    ) -> PendingWalletPayment | None:
        """Locate the in-flight payment from the wallet callback, preferring our own reference."""
        if order_reference:
            pending = self.pending_repo.get_by_reference(order_reference)
            if pending:
                return pending
        if wallet_reference:
            return self.pending_repo.get_by_wallet_reference(wallet_reference)
        return None

    def find_completed_payment(
        self, order_reference: str | None, wallet_reference: str | None
    ) -> Payment | None:
        """Locate an already-completed transaction record (idempotent callbacks)."""
        if order_reference:
            payment = self.payment_repo.get_by_reference(order_reference)
            if payment:
                return payment
        if wallet_reference:
            return self.payment_repo.get_by_wallet_reference(wallet_reference)
        return None

    def finalize_wallet_payment(self, pending: PendingWalletPayment) -> Payment:
        """Create the transaction record for a payment completed on the wallet hosted page.

        The wallet redirects the customer's browser here after OTP + PIN are
        entered. We re-verify the status against the wallet (server to server)
        so a forged redirect cannot create a transaction record, then record it
        and activate the parent entity. Safe to call multiple times.
        """
        account = self._account_for_pending(pending)
        result = self.wallet_client.get_payment_status(
            pending.wallet_payment_reference, api_key=account.api_key
        )

        if result.get("status") != "completed":
            pending.message = result.get("status") or "Payment was not completed."
            self.db.commit()
            raise BadRequestException(pending.message)

        transaction_number = str(result.get("transaction_number") or result.get("id") or "")
        return self._complete_payment(pending, account, transaction_number)

    def redirect_url_for(self, payment: object, status: str) -> str:
        """Frontend URL the callback redirects the browser to after finalizing."""
        query = f"reference={payment.reference}&status={status}"
        return f"{self._redirect_app_url(payment.session_id, payment.subscription_id)}?{query}"

    def redirect_url_for_unknown(self, app: str, status: str) -> str:
        """Fallback frontend URL when the payment could not be found locally."""
        base = settings.CUSTOMER_APP_URL if app == "customer" else settings.MANAGEMENT_APP_URL
        return f"{base.rstrip('/')}/wallet-payment/result?status={status}"

    # ─── Transaction list (external-system wallet payments) ──────────────────

    def list_payments(
        self, params: PaginationParams, current_user: User
    ) -> tuple[list[PaymentListOut], Meta]:
        """List external wallet transaction records.

        Admin sees every payment; an owner sees only the parking fees received
        into their wallet accounts plus their own subscription payments.
        """
        stmt = (
            select(Payment)
            .options(
                joinedload(Payment.user),
                joinedload(Payment.wallet_account)
                .joinedload(WalletAccount.owner)
                .joinedload(ParkingOwner.user),
                joinedload(Payment.session)
                .joinedload(ParkingSession.car)
                .joinedload(Car.customer)
                .joinedload(Customer.user),
                joinedload(Payment.session)
                .joinedload(ParkingSession.slot)
                .joinedload(ParkingSlot.floor)
                .joinedload(ParkingFloor.parking_lot),
                joinedload(Payment.subscription).joinedload(OwnerSubscription.package),
                joinedload(Payment.subscription)
                .joinedload(OwnerSubscription.owner)
                .joinedload(ParkingOwner.user),
            )
        )

        if current_user.role.name == RoleName.OWNER.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            if not owner:
                raise ForbiddenException("Owner profile not found.")
            stmt = stmt.where(
                or_(
                    Payment.subscription_id.in_(
                        select(OwnerSubscription.id).where(
                            OwnerSubscription.owner_id == owner.id
                        )
                    ),
                    Payment.wallet_account_id.in_(
                        select(WalletAccount.id).where(WalletAccount.owner_id == owner.id)
                    ),
                )
            )
        elif current_user.role.name != RoleName.ADMIN.value:
            raise ForbiddenException("You do not have permission to view wallet payments.")

        if params.search:
            like = f"%{params.search.strip()}%"
            stmt = stmt.where(
                or_(
                    Payment.reference.ilike(like),
                    Payment.wallet_payment_reference.ilike(like),
                    Payment.wallet_transaction_number.ilike(like),
                    Payment.receiver_phone.ilike(like),
                    Payment.session.has(ParkingSession.car.has(Car.plate_number.ilike(like))),
                )
            )

        stmt = stmt.order_by(Payment.created_at.desc())
        items, total = self.payment_repo.paginate(stmt, page=params.page, limit=params.limit)

        is_owner = current_user.role.name == RoleName.OWNER.value
        rows: list[PaymentListOut] = []
        for payment in items:
            item = self._payment_list_item(payment)
            if is_owner:
                item.direction = "paid" if item.kind == "subscription" else "received"
            rows.append(item)

        return rows, build_meta(total, params.page, params.limit)

    def _payment_list_item(self, payment: Payment) -> PaymentListOut:
        payer = payment.user
        base = dict(
            id=payment.id,
            reference=payment.reference,
            kind="subscription" if payment.subscription_id is not None else "session",
            wallet_payment_reference=payment.wallet_payment_reference,
            wallet_transaction_number=payment.wallet_transaction_number,
            receiver_phone=payment.receiver_phone,
            payer_name=payer.name if payer else None,
            payer_phone=payer.phone if payer else None,
            amount=payment.amount,
            fee=payment.fee,
            total=payment.total,
            status=payment.status,
            paid_at=payment.paid_at,
            created_at=payment.created_at,
            lot_name=None,
            plate_number=None,
            package_name=None,
            owner_name=None,
            direction=None,
        )

        if payment.subscription_id is not None:
            subscription = payment.subscription
            base["package_name"] = subscription.package.name if subscription and subscription.package else None
            owner = subscription.owner if subscription else None
            base["owner_name"] = owner.user.name if owner and owner.user else None
        else:
            session = payment.session
            if session:
                car = session.car
                base["plate_number"] = car.plate_number if car else None
                slot = session.slot
                floor = slot.floor if slot else None
                lot = floor.parking_lot if floor else None
                base["lot_name"] = lot.name if lot else None

        return PaymentListOut(**base)
