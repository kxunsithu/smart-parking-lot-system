"""Business logic for Owner Subscriptions: purchase, renew, and access gate."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
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
from app.schemas.owner_subscription import SubscriptionPurchase


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

    def purchase(self, payload: SubscriptionPurchase, current_user: User) -> OwnerSubscription:
        owner_id = self._resolve_owner_id(current_user, payload.owner_id)

        pkg = self.pkg_repo.get(payload.package_id)
        if not pkg or not pkg.is_active:
            raise NotFoundException("Package not found or is no longer available.")

        # Mark any existing ACTIVE subscription as EXPIRED before creating a new one
        existing = self.sub_repo.get_active_by_owner_id(owner_id)
        if existing:
            self.sub_repo.update(existing, {"status": SubscriptionStatus.EXPIRED.value})

        now = datetime.now(timezone.utc)
        sub = OwnerSubscription(
            owner_id=owner_id,
            package_id=pkg.id,
            started_at=now,
            expires_at=now + timedelta(days=pkg.duration_days),
            status=SubscriptionStatus.ACTIVE.value,
            payment_method=payload.payment_method or "CASH",
            amount=pkg.price,
            transaction_ref=payload.transaction_ref,
        )
        return self.sub_repo.create(sub)

    def renew(self, payload: SubscriptionPurchase, current_user: User) -> OwnerSubscription:
        """Extend subscription: if active, extends from expires_at; otherwise from now."""
        owner_id = self._resolve_owner_id(current_user, payload.owner_id)

        pkg = self.pkg_repo.get(payload.package_id)
        if not pkg or not pkg.is_active:
            raise NotFoundException("Package not found or is no longer available.")

        now = datetime.now(timezone.utc)
        latest = self.sub_repo.get_latest_by_owner_id(owner_id)

        if latest:
            # Normalise – SQLite returns naive datetimes, PostgreSQL returns aware
            exp = latest.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            still_active = exp > now
        else:
            still_active = False

        if still_active and latest:
            start = exp  # type: ignore[possibly-undefined]
        else:
            start = now

        sub = OwnerSubscription(
            owner_id=owner_id,
            package_id=pkg.id,
            started_at=start,
            expires_at=start + timedelta(days=pkg.duration_days),
            status=SubscriptionStatus.ACTIVE.value,
            payment_method=payload.payment_method or "CASH",
            amount=pkg.price,
            transaction_ref=payload.transaction_ref,
        )
        return self.sub_repo.create(sub)


    def get_active_subscription(self, owner_id: int) -> OwnerSubscription | None:
        return self.sub_repo.get_active_by_owner_id(owner_id)

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
        stmt = (
            select(OwnerSubscription)
            .options(joinedload(OwnerSubscription.package))
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
            select(ParkingLot).where(ParkingLot.owner_id == owner_id).with_only_columns(
                __import__("sqlalchemy").func.count()
            )
        ) or 0

    def toggle_subscription_status(self, subscription_id: int) -> OwnerSubscription:
        from app.core.exceptions import NotFoundException
        sub = self.sub_repo.get(subscription_id)
        if not sub:
            raise NotFoundException("Subscription not found.")
        
        # Toggle between ACTIVE and CANCELLED
        if sub.status == SubscriptionStatus.ACTIVE.value:
            new_status = SubscriptionStatus.CANCELLED.value
        elif sub.status == SubscriptionStatus.CANCELLED.value:
            new_status = SubscriptionStatus.ACTIVE.value
        else:
            # EXPIRED subscriptions cannot be toggled
            raise ForbiddenException("Cannot toggle expired subscriptions.")
        
        return self.sub_repo.update(sub, {"status": new_status})
