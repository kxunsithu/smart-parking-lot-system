"""Business logic for Payments."""
from sqlalchemy.orm import Session

from app.core.constants import PaymentStatus, RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.payment import Payment
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.payment_repository import PaymentRepository
from app.schemas.payment import PaymentCreate


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.session_repo = ParkingSessionRepository(db)
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

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)

        payment = Payment(
            parking_session_id=payload.parking_session_id,
            customer_id=customer_id,
            amount=payload.amount,
            payment_method=payload.payment_method.value,
            status=PaymentStatus.PAID.value,
        )
        return self.payment_repo.create(payment)
