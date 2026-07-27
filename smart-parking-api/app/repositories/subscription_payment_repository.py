"""Repository for SubscriptionPayment model."""
from sqlalchemy.orm import Session

from app.models.subscription_payment import SubscriptionPayment
from app.repositories.base_repository import BaseRepository


class SubscriptionPaymentRepository(BaseRepository[SubscriptionPayment]):
    def __init__(self, db: Session):
        super().__init__(db, SubscriptionPayment)

    def get_by_subscription_id(self, subscription_id: int) -> list[SubscriptionPayment]:
        return self.db.query(SubscriptionPayment).filter(
            SubscriptionPayment.subscription_id == subscription_id
        ).all()
