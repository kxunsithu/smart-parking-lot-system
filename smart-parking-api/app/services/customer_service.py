"""Business logic for Customer profiles."""
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.customer import CustomerUpdate


class CustomerService:
    def __init__(self, db: Session):
        self.db = db
        self.customer_repo = CustomerRepository(db)

    def get_by_id(self, customer_id: int) -> Customer:
        customer = self.db.scalar(
            select(Customer).options(joinedload(Customer.user)).where(Customer.id == customer_id)
        )
        if not customer:
            raise NotFoundException("Resource not found.")
        return customer

    def get_by_user_id(self, user_id: int) -> Customer:
        customer = self.customer_repo.get_by_user_id(user_id)
        if not customer:
            raise NotFoundException("Customer profile not found for the current user.")
        return customer

    def list_customers(self, params: PaginationParams):
        stmt = select(Customer).options(joinedload(Customer.user))
        items, total = self.customer_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def update_customer(self, customer_id: int, payload: CustomerUpdate) -> Customer:
        customer = self.get_by_id(customer_id)
        data = payload.model_dump(exclude_unset=True)
        return self.customer_repo.update(customer, data)
