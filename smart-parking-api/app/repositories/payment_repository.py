"""Repository for the Payment (wallet payment) model."""
from sqlalchemy import select

from app.models.payment import Payment
from app.repositories.base import BaseRepository


class PaymentRepository(BaseRepository[Payment]):
    model = Payment

    def get_by_reference(self, reference: str) -> Payment | None:
        return self.db.scalars(
            select(Payment).where(Payment.reference == reference)
        ).first()

    def get_by_wallet_reference(self, wallet_reference: str) -> Payment | None:
        return self.db.scalars(
            select(Payment).where(Payment.wallet_payment_reference == wallet_reference)
        ).first()
