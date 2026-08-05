"""Repository for the PendingWalletPayment (in-flight wallet payment) model."""
from sqlalchemy import select

from app.models.pending_payment import PendingWalletPayment
from app.repositories.base import BaseRepository


class PendingWalletPaymentRepository(BaseRepository[PendingWalletPayment]):
    model = PendingWalletPayment

    def get_by_reference(self, reference: str) -> PendingWalletPayment | None:
        return self.db.scalar(
            select(PendingWalletPayment).where(PendingWalletPayment.reference == reference)
        )

    def get_by_wallet_reference(self, wallet_reference: str) -> PendingWalletPayment | None:
        return self.db.scalar(
            select(PendingWalletPayment).where(
                PendingWalletPayment.wallet_payment_reference == wallet_reference
            )
        )
