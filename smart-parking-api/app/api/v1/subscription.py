"""Subscription endpoints: plans, subscriptions, and subscription checks."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionOut,
    SubscriptionPlanCreate,
    SubscriptionPlanOut,
    SubscriptionPlanUpdate,
    SubscriptionPurchaseRequest,
    SubscriptionUpdate,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# Subscription Plan Endpoints (Admin only)
@router.post("/plans", response_model=SuccessResponse[SubscriptionPlanOut], status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    plan = SubscriptionService(db).create_plan(payload)
    return {"success": True, "message": "Subscription plan created successfully.", "data": plan}


@router.get("/plans", response_model=SuccessResponse[list[SubscriptionPlanOut]])
def get_plans(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER)),
):
    plans = SubscriptionService(db).get_plans(active_only=active_only)
    return {"success": True, "message": "Subscription plans fetched successfully.", "data": plans}


@router.get("/plans/{plan_id}", response_model=SuccessResponse[SubscriptionPlanOut])
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER)),
):
    plan = SubscriptionService(db).get_plan(plan_id)
    return {"success": True, "message": "Subscription plan fetched successfully.", "data": plan}


@router.put("/plans/{plan_id}", response_model=SuccessResponse[SubscriptionPlanOut])
def update_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    plan = SubscriptionService(db).update_plan(plan_id, payload)
    return {"success": True, "message": "Subscription plan updated successfully.", "data": plan}


@router.delete("/plans/{plan_id}", response_model=SuccessResponse[None])
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    SubscriptionService(db).delete_plan(plan_id)
    return {"success": True, "message": "Subscription plan deleted successfully.", "data": None}


# Subscription Endpoints
@router.post("/", response_model=SuccessResponse[SubscriptionOut], status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    subscription = SubscriptionService(db).create_subscription(payload)
    return {"success": True, "message": "Subscription created successfully.", "data": subscription}


@router.get("/me", response_model=SuccessResponse[SubscriptionOut | None])
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    # Get parking owner for current user
    from app.repositories.parking_owner_repository import ParkingOwnerRepository
    owner_repo = ParkingOwnerRepository(db)
    owner = owner_repo.get_by_user_id(current_user.id)
    
    if not owner:
        return {"success": True, "message": "No parking owner found.", "data": None}
    
    subscription = SubscriptionService(db).get_owner_subscription(owner.id)
    return {"success": True, "message": "Subscription fetched successfully.", "data": subscription}


@router.get("/me/status", response_model=SuccessResponse[dict])
def get_my_subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    # Get parking owner for current user
    from app.repositories.parking_owner_repository import ParkingOwnerRepository
    owner_repo = ParkingOwnerRepository(db)
    owner = owner_repo.get_by_user_id(current_user.id)
    
    if not owner:
        return {"success": True, "message": "No parking owner found.", "data": {"has_subscription": False, "status": "none"}}
    
    status_info = SubscriptionService(db).check_subscription_status(owner.id)
    return {"success": True, "message": "Subscription status fetched successfully.", "data": status_info}


@router.get("/{subscription_id}", response_model=SuccessResponse[SubscriptionOut])
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    subscription = SubscriptionService(db).get_subscription(subscription_id)
    return {"success": True, "message": "Subscription fetched successfully.", "data": subscription}


@router.put("/{subscription_id}", response_model=SuccessResponse[SubscriptionOut])
def update_subscription(
    subscription_id: int,
    payload: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    subscription = SubscriptionService(db).update_subscription(subscription_id, payload)
    return {"success": True, "message": "Subscription updated successfully.", "data": subscription}


@router.post("/{subscription_id}/cancel", response_model=SuccessResponse[SubscriptionOut])
def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN)),
):
    subscription = SubscriptionService(db).cancel_subscription(subscription_id)
    return {"success": True, "message": "Subscription cancelled successfully.", "data": subscription}


@router.post("/purchase", response_model=SuccessResponse[SubscriptionOut], status_code=status.HTTP_201_CREATED)
def purchase_subscription(
    payload: SubscriptionPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    # Get parking owner for current user
    from app.repositories.parking_owner_repository import ParkingOwnerRepository
    owner_repo = ParkingOwnerRepository(db)
    owner = owner_repo.get_by_user_id(current_user.id)
    
    if not owner:
        raise Exception("No parking owner found")
    
    # Purchase or renew subscription
    subscription = SubscriptionService(db).purchase_subscription(
        owner_id=owner.id,
        plan_id=payload.plan_id,
        total_slots=payload.total_slots,
    )
    return {"success": True, "message": "Subscription purchased successfully.", "data": subscription}
