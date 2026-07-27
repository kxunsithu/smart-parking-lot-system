"""Subscription plan repository for database operations."""
from sqlalchemy.orm import Session

from app.models.subscription_plan import SubscriptionPlan
from app.repositories.base import BaseRepository


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    model = SubscriptionPlan

    def __init__(self, db: Session):
        super().__init__(db)

    def get_active_plans(self):
        return self.db.query(self.model).filter(self.model.is_active == 1).all()
