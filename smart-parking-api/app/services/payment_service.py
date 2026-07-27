"""Business logic for Payments."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import PaymentStatus, RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.payment import Payment
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.reservation_repository import ReservationRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.payment import PaymentCreate


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.payment_repo = PaymentRepository(db)
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

    def create_payment(self, payload: PaymentCreate, current_user: User) -> Payment:
        session = self.session_repo.get(payload.parking_session_id)
        if not session:
            raise NotFoundException("Parking session not found.")

        if payload.reservation_id and not self.reservation_repo.get(payload.reservation_id):
            raise NotFoundException("Reservation not found.")

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)

        payment = Payment(
            parking_session_id=payload.parking_session_id,
            customer_id=customer_id,
            reservation_id=payload.reservation_id,
            amount=payload.amount,
            payment_method=payload.payment_method.value,
            status=PaymentStatus.PAID.value,
        )
        return self.payment_repo.create(payment)

    def get_by_id(self, payment_id: int) -> Payment:
        payment = self.payment_repo.get(payment_id)
        if not payment:
            raise NotFoundException("Resource not found.")
        return payment

    def _assert_can_view(self, payment: Payment, current_user: User) -> None:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.OWNER.value, RoleName.STAFF.value):
            return
        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer or payment.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to view this payment.")

    def get_viewable_payment(self, payment_id: int, current_user: User) -> Payment:
        """Fetch a payment and assert the current user is allowed to view it."""
        payment = self.get_by_id(payment_id)
        self._assert_can_view(payment, current_user)
        return payment

    def list_payments(
        self,
        params: PaginationParams,
        current_user: User,
        status: str | None = None,
        customer_id: int | None = None,
    ):
        stmt = select(Payment)
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            stmt = stmt.where(Payment.customer_id == customer.id if customer else -1)
        elif customer_id:
            stmt = stmt.where(Payment.customer_id == customer_id)
        if status:
            stmt = stmt.where(Payment.status == status)

        items, total = self.payment_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def update_status(self, payment_id: int, status: PaymentStatus, current_user: User) -> Payment:
        if current_user.role.name not in (RoleName.ADMIN.value, RoleName.OWNER.value, RoleName.STAFF.value):
            raise ForbiddenException("Only Staff, Owner, or Admin can update payment status.")
        payment = self.get_by_id(payment_id)
        payment.status = status.value
        self.db.commit()
        self.db.refresh(payment)
        return payment
