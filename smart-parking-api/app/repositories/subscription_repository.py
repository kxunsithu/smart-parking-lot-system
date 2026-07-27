"""Subscription repository for database operations."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.repositories.base import BaseRepository


class SubscriptionRepository(BaseRepository[Subscription]):
    model = Subscription

    def __init__(self, db: Session):
        super().__init__(db)

    def get_by_owner_id(self, owner_id: int):
        return (
            self.db.query(self.model)
            .filter(self.model.parking_owner_id == owner_id)
            .order_by(self.model.created_at.desc())
            .first()
        )

    def get_active_subscription(self, owner_id: int):
        now = datetime.now(timezone.utc)
        return (
            self.db.query(self.model)
            .filter(
                self.model.parking_owner_id == owner_id,
                self.model.status == "active",
                self.model.end_date > now,
            )
            .first()
        )
