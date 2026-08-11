"""Business logic for Owner Subscriptions: create-on-payment-complete and access gate."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import RoleName, SubscriptionStatus
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.owner_subscription import OwnerSubscription
from app.models.parking_lot import ParkingLot
from app.models.user import User
from app.repositories.owner_subscription_repository import OwnerSubscriptionRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.schemas.common import PaginationParams, build_meta


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.sub_repo = OwnerSubscriptionRepository(db)
        self.pkg_repo = PackageRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)

    def _resolve_owner_id(self, current_user: User, requested_owner_id: int | None) -> int:
        if current_user.role.name == RoleName.ADMIN.value:
            if not requested_owner_id:
                raise ForbiddenException("owner_id is required when Admin purchases a subscription.")
            if not self.owner_repo.get(requested_owner_id):
                raise NotFoundException("Owner not found.")
            return requested_owner_id
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner:
            raise ForbiddenException("Owner profile not found.")
        return owner.id

    def create_and_activate(
        self,
        owner_id: int,
        package_id: int,
        is_renewal: bool,
        amount: float,
    ) -> "OwnerSubscription":
        """Create an ACTIVE subscription immediately (called after payment is confirmed).

        If ``is_renewal`` is True and the owner already has an active subscription,
        the new period extends from the current expiry date and the old subscription
        is marked EXPIRED. Otherwise the new subscription starts from now.
        """
        pkg = self.pkg_repo.get(package_id)
        if not pkg or not pkg.is_active:
            raise NotFoundException("Package not found or is no longer available.")

        now = datetime.now(timezone.utc)
        existing = self.sub_repo.get_active_by_owner_id(owner_id)

        if is_renewal and existing and existing.id:
            start = existing.expires_at
            if start is not None:
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                if start < now:
                    start = now
            else:
                start = now
            self.sub_repo.update(existing, {"status": SubscriptionStatus.EXPIRED.value})
        else:
            start = now

        sub = OwnerSubscription(
            owner_id=owner_id,
            package_id=pkg.id,
            started_at=start,
            expires_at=start + timedelta(days=pkg.duration_days),
            status=SubscriptionStatus.ACTIVE.value,
            amount=amount,
        )
        return self.sub_repo.create(sub)


    def get_active_subscription(self, owner_id: int) -> OwnerSubscription | None:
        return self.sub_repo.get_active_by_owner_id(owner_id)

    def get_subscription(self, subscription_id: int) -> OwnerSubscription:
        from sqlalchemy.orm import joinedload
        from app.models.parking_owner import ParkingOwner
        sub = self.db.scalar(
            select(OwnerSubscription)
            .options(
                joinedload(OwnerSubscription.package),
                joinedload(OwnerSubscription.owner).joinedload(ParkingOwner.user),
            )
            .where(OwnerSubscription.id == subscription_id)
        )
        if not sub:
            raise NotFoundException("Subscription not found.")
        return sub

    def check_subscription_required(self, owner_id: int) -> None:
        """Raise ForbiddenException if the owner has no active subscription."""
        sub = self.sub_repo.get_active_by_owner_id(owner_id)
        if not sub:
            raise ForbiddenException(
                "An active subscription is required to perform this action. "
                "Please purchase or renew a package."
            )

    def get_my_subscriptions(self, current_user: User) -> list[OwnerSubscription]:
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner:
            raise ForbiddenException("Owner profile not found.")
        return self.sub_repo.get_all_by_owner_id(owner.id)

    def list_all_subscriptions(self, params: PaginationParams):
        from sqlalchemy.orm import joinedload
        from app.models.parking_owner import ParkingOwner
        stmt = (
            select(OwnerSubscription)
            .options(
                joinedload(OwnerSubscription.package),
                joinedload(OwnerSubscription.owner).joinedload(ParkingOwner.user),
            )
            .order_by(OwnerSubscription.created_at.desc())
        )
        items, total = self.sub_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
        )
        return items, build_meta(total, params.page, params.limit)

    def get_lot_limit(self, owner_id: int) -> int:
        """Return max_lots from active subscription (0 if no subscription)."""
        sub = self.sub_repo.get_active_by_owner_id(owner_id)
        if not sub or not sub.package:
            return 0
        return sub.package.max_lots

    def get_current_lot_count(self, owner_id: int) -> int:
        return self.db.scalar(
            select(func.count(ParkingLot.id)).where(ParkingLot.owner_id == owner_id)
        ) or 0

    def toggle_subscription_status(self, subscription_id: int) -> OwnerSubscription:
        sub = self.sub_repo.get(subscription_id)
        if not sub:
            raise NotFoundException("Subscription not found.")

        # Toggle between ACTIVE and CANCELLED only (PENDING subscriptions no longer created)
        if sub.status == SubscriptionStatus.ACTIVE.value:
            new_status = SubscriptionStatus.CANCELLED.value
        elif sub.status == SubscriptionStatus.CANCELLED.value:
            new_status = SubscriptionStatus.ACTIVE.value
        else:
            # EXPIRED subscriptions cannot be toggled
            raise ForbiddenException("Cannot toggle expired or pending subscriptions.")

        return self.sub_repo.update(sub, {"status": new_status})
