"""Subscription service for managing subscriptions."""
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.parking_owner import ParkingOwner
from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.subscription_plan_repository import SubscriptionPlanRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import SubscriptionCreate, SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionUpdate


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.plan_repo = SubscriptionPlanRepository(db)
        self.subscription_repo = SubscriptionRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)

    # Subscription Plan Management
    def create_plan(self, payload: SubscriptionPlanCreate) -> SubscriptionPlan:
        plan = SubscriptionPlan(**payload.model_dump())
        return self.plan_repo.create(plan)

    def get_plans(self, active_only: bool = True):
        if active_only:
            return self.plan_repo.get_active_plans()
        return self.plan_repo.get_all()

    def get_plan(self, plan_id: int) -> SubscriptionPlan:
        plan = self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise NotFoundException("Subscription plan not found")
        return plan

    def update_plan(self, plan_id: int, payload: SubscriptionPlanUpdate) -> SubscriptionPlan:
        plan = self.get_plan(plan_id)
        data = payload.model_dump(exclude_unset=True)
        return self.plan_repo.update(plan, data)

    def delete_plan(self, plan_id: int) -> None:
        plan = self.get_plan(plan_id)
        # Soft delete by setting is_active to 0
        plan.is_active = 0
        self.db.commit()

    # Subscription Management
    def calculate_total_price(self, plan: SubscriptionPlan, total_slots: int) -> float:
        """Calculate total price based on slot count"""
        return plan.per_slot_price * total_slots

    def create_subscription(self, payload: SubscriptionCreate) -> Subscription:
        # Verify plan exists
        plan = self.get_plan(payload.plan_id)
        
        # Verify owner exists
        owner = self.owner_repo.get_by_id(payload.parking_owner_id)
        if not owner:
            raise NotFoundException("Parking owner not found")

        # Check if owner already has active subscription
        existing = self.subscription_repo.get_active_subscription(payload.parking_owner_id)
        if existing:
            raise BadRequestException("Owner already has an active subscription")

        subscription = Subscription(
            parking_owner_id=payload.parking_owner_id,
            plan_id=payload.plan_id,
            total_slots=payload.total_slots,
            total_price=payload.total_price,
            status=payload.status,
        )
        return self.subscription_repo.create(subscription)

    def purchase_subscription(self, owner_id: int, plan_id: int, total_slots: int) -> Subscription:
        """Purchase or renew subscription for owner"""
        # Verify plan exists
        plan = self.get_plan(plan_id)

        # Verify owner exists
        owner = self.owner_repo.get_by_id(owner_id)
        if not owner:
            raise NotFoundException("Parking owner not found")

        # Calculate total price
        total_price = self.calculate_total_price(plan, total_slots)

        # Check if owner has existing subscription
        existing = self.subscription_repo.get_active_subscription(owner_id)

        if existing:
            # Renew: add slots to existing subscription
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)

            existing.total_slots = existing.total_slots + total_slots
            existing.total_price = existing.total_price + total_price
            existing.status = "active"
            existing.updated_at = now
            self.db.commit()
            return existing
        else:
            # New subscription
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)

            subscription = Subscription(
                parking_owner_id=owner_id,
                plan_id=plan_id,
                total_slots=total_slots,
                total_price=total_price,
                status="active",
            )
            return self.subscription_repo.create(subscription)

    def get_subscription(self, subscription_id: int) -> Subscription:
        subscription = self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException("Subscription not found")
        return subscription

    def get_owner_subscription(self, owner_id: int) -> Subscription | None:
        return self.subscription_repo.get_by_owner_id(owner_id)

    def get_owner_active_subscription(self, owner_id: int) -> Subscription | None:
        return self.subscription_repo.get_active_subscription(owner_id)

    def update_subscription(self, subscription_id: int, payload: SubscriptionUpdate) -> Subscription:
        subscription = self.get_subscription(subscription_id)
        data = payload.model_dump(exclude_unset=True)
        return self.subscription_repo.update(subscription, data)

    def cancel_subscription(self, subscription_id: int) -> Subscription:
        subscription = self.get_subscription(subscription_id)
        subscription.status = "cancelled"
        self.db.commit()
        return subscription

    def check_subscription_status(self, owner_id: int) -> dict:
        """Check if owner has valid subscription"""
        subscription = self.subscription_repo.get_active_subscription(owner_id)

        if not subscription:
            return {
                "has_subscription": False,
                "status": "none",
                "message": "No active subscription found",
            }

        if subscription.status != "active":
            return {
                "has_subscription": False,
                "status": subscription.status,
                "message": f"Subscription is {subscription.status}",
            }

        return {
            "has_subscription": True,
            "status": "active",
            "subscription": subscription,
            "message": "Active subscription",
        }
