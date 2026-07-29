"""Business logic for Payments."""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import PaymentStatus, RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.payment import Payment
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.payment_repository import PaymentRepository
from app.schemas.common import PaginationParams
from app.schemas.payment import PaymentCreate


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.session_repo = ParkingSessionRepository(db)
        self.customer_repo = CustomerRepository(db)

    def _resolve_customer_id(self, current_user: User, requested_customer_id: int | None) -> int:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value, RoleName.OWNER.value):
            if not requested_customer_id:
                raise ForbiddenException("customer_id is required for Admin/Owner/Staff.")
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
            transaction_ref=payload.transaction_ref,
            status=PaymentStatus.PAID.value,
        )
        return self.payment_repo.create(payment)

    def list_payments(
        self,
        current_user: User,
        pagination: PaginationParams,
        payment_method: Optional[str] = None,
    ) -> tuple[list[Payment], int]:
        stmt = select(Payment)
        if payment_method:
            stmt = stmt.where(Payment.payment_method == payment_method)

        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            if customer:
                stmt = stmt.where(Payment.customer_id == customer.id)
            else:
                return [], 0

        sort_by = pagination.sort_by or "id"
        order = pagination.order or "desc"

        items, total = self.payment_repo.paginate(
            stmt=stmt,
            page=pagination.page,
            limit=pagination.limit,
            sort_by=sort_by,
            order=order,
            search=pagination.search,
            search_fields=[Payment.transaction_ref, Payment.payment_method],
        )
        return items, total
