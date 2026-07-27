from typing import Optional

from sqlalchemy import select

from app.models.customer import Customer
from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    model = Customer

    def get_by_user_id(self, user_id: int) -> Optional[Customer]:
        return self.db.scalar(select(Customer).where(Customer.user_id == user_id))
