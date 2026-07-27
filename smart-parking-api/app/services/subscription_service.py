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

        # Calculate end date based on plan duration
        end_date = payload.start_date + timedelta(days=plan.duration_months * 30)

        subscription = Subscription(
            parking_owner_id=payload.parking_owner_id,
            plan_id=payload.plan_id,
            start_date=payload.start_date,
            end_date=end_date,
            status=payload.status,
            payment_status=payload.payment_status,
            amount_paid=payload.amount_paid,
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
        if payload.payment_status == "paid" and not subscription.payment_date:
            data["payment_date"] = datetime.now(timezone.utc)
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
        
        if subscription.payment_status != "paid":
            return {
                "has_subscription": False,
                "status": "unpaid",
                "message": "Subscription payment is pending",
            }
        
        return {
            "has_subscription": True,
            "status": "active",
            "subscription": subscription,
            "message": "Active subscription",
        }
