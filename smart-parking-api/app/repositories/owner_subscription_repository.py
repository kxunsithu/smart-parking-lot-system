"""Repository for OwnerSubscription model."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.constants import SubscriptionStatus
from app.models.owner_subscription import OwnerSubscription
from app.repositories.base import BaseRepository


class OwnerSubscriptionRepository(BaseRepository[OwnerSubscription]):
    model = OwnerSubscription

    def get_active_by_owner_id(self, owner_id: int) -> OwnerSubscription | None:
        # Use naive UTC datetime so this works on both SQLite (naive) and PostgreSQL (aware)
        from datetime import timezone as _tz
        now_naive = datetime.now(_tz.utc).replace(tzinfo=None)
        now_aware = datetime.now(_tz.utc)
        return self.db.scalar(
            select(OwnerSubscription)
            .options(joinedload(OwnerSubscription.package))
            .where(
                OwnerSubscription.owner_id == owner_id,
                OwnerSubscription.status == SubscriptionStatus.ACTIVE.value,
                # Compare without tzinfo to be compatible with SQLite
                OwnerSubscription.expires_at > now_naive,
            )
            .order_by(OwnerSubscription.expires_at.desc())
        )

    def get_latest_by_owner_id(self, owner_id: int) -> OwnerSubscription | None:
        """Returns the most recent subscription (regardless of status) for renewal logic."""
        return self.db.scalar(
            select(OwnerSubscription)
            .options(joinedload(OwnerSubscription.package))
            .where(OwnerSubscription.owner_id == owner_id)
            .order_by(OwnerSubscription.expires_at.desc())
        )

    def get_all_by_owner_id(self, owner_id: int) -> list[OwnerSubscription]:
        return list(
            self.db.scalars(
                select(OwnerSubscription)
                .options(joinedload(OwnerSubscription.package))
                .where(OwnerSubscription.owner_id == owner_id)
                .order_by(OwnerSubscription.created_at.desc())
            ).all()
        )
