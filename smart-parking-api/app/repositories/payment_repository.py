"""Repository for Payment model."""
from sqlalchemy import select

from app.models.payment import Payment
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    model = Payment

    def get_by_session_id(self, parking_session_id: int) -> list[Payment]:
        return list(
            self.db.scalars(
                select(Payment).where(Payment.parking_session_id == parking_session_id)
            ).all()
        )
