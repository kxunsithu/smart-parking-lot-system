"""Business logic for Payments."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import PaymentStatus, RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.parking_session_payment import ParkingSessionPayment
from app.models.reservation_payment import ReservationPayment
from app.models.subscription_payment import SubscriptionPayment
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_session_payment_repository import ParkingSessionPaymentRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.reservation_payment_repository import ReservationPaymentRepository
from app.repositories.reservation_repository import ReservationRepository
from app.repositories.subscription_payment_repository import SubscriptionPaymentRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.payment import (
    ParkingSessionPaymentCreate,
    ReservationPaymentCreate,
    SubscriptionPaymentCreate,
)


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.subscription_payment_repo = SubscriptionPaymentRepository(db)
        self.session_payment_repo = ParkingSessionPaymentRepository(db)
        self.reservation_payment_repo = ReservationPaymentRepository(db)
        self.session_repo = ParkingSessionRepository(db)
        self.reservation_repo = ReservationRepository(db)
        self.customer_repo = CustomerRepository(db)

    def _resolve_customer_id(self, current_user: User, requested_customer_id: int | None) -> int:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value):
            if not requested_customer_id:
                raise ForbiddenException("customer_id is required for Admin/Staff.")
            if not self.customer_repo.get(requested_customer_id):
                raise NotFoundException("Customer not found.")
            return requested_customer_id

        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer:
            raise ForbiddenException("Only Customers can create payments for themselves.")
        return customer.id

    # Subscription Payments
    def create_subscription_payment(self, payload: SubscriptionPaymentCreate) -> SubscriptionPayment:
        from app.repositories.subscription_repository import SubscriptionRepository
        subscription_repo = SubscriptionRepository(self.db)
        subscription = subscription_repo.get(payload.subscription_id)
        if not subscription:
            raise NotFoundException("Subscription not found.")

        payment = SubscriptionPayment(
            subscription_id=payload.subscription_id,
            amount=payload.amount,
            payment_method=payload.payment_method.value,
            status=PaymentStatus.PAID.value,
        )
        return self.subscription_payment_repo.create(payment)

    # Parking Session Payments
    def create_session_payment(self, payload: ParkingSessionPaymentCreate, current_user: User) -> ParkingSessionPayment:
        session = self.session_repo.get(payload.parking_session_id)
        if not session:
            raise NotFoundException("Parking session not found.")

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)

        payment = ParkingSessionPayment(
            parking_session_id=payload.parking_session_id,
            customer_id=customer_id,
            amount=payload.amount,
            payment_method=payload.payment_method.value,
            status=PaymentStatus.PAID.value,
        )
        return self.session_payment_repo.create(payment)

    # Reservation Payments
    def create_reservation_payment(self, payload: ReservationPaymentCreate, current_user: User) -> ReservationPayment:
        reservation = self.reservation_repo.get(payload.reservation_id)
        if not reservation:
            raise NotFoundException("Reservation not found.")

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)

        payment = ReservationPayment(
            reservation_id=payload.reservation_id,
            customer_id=customer_id,
            amount=payload.amount,
            payment_method=payload.payment_method.value,
            status=PaymentStatus.PAID.value,
        )
        return self.reservation_payment_repo.create(payment)
