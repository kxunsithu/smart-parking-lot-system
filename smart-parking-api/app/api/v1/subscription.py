"""Subscription endpoints: Owner purchases and renews packages."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.core.exceptions import ForbiddenException
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.schemas.owner_subscription import SubscriptionOut, SubscriptionPurchase
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post(
    "/purchase",
    response_model=SuccessResponse[SubscriptionOut],
    status_code=status.HTTP_201_CREATED,
)
def purchase_subscription(
    payload: SubscriptionPurchase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER, RoleName.ADMIN)),
):
    sub = SubscriptionService(db).purchase(payload, current_user)
    return {"success": True, "message": "Subscription activated successfully.", "data": sub}


@router.post(
    "/renew",
    response_model=SuccessResponse[SubscriptionOut],
    status_code=status.HTTP_201_CREATED,
)
def renew_subscription(
    payload: SubscriptionPurchase,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER, RoleName.ADMIN)),
):
    sub = SubscriptionService(db).renew(payload, current_user)
    return {"success": True, "message": "Subscription renewed successfully.", "data": sub}


@router.get("/me", response_model=SuccessResponse[list[SubscriptionOut]])
def my_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    subs = SubscriptionService(db).get_my_subscriptions(current_user)
    return {"success": True, "message": "Subscriptions fetched successfully.", "data": subs}


@router.get("/active", response_model=SuccessResponse[SubscriptionOut | None])
def active_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    owner = ParkingOwnerRepository(db).get_by_user_id(current_user.id)
    if not owner:
        raise ForbiddenException("Owner profile not found.")
    sub = SubscriptionService(db).get_active_subscription(owner.id)
    return {"success": True, "message": "Active subscription fetched.", "data": sub}


@router.get("", response_model=SuccessResponse[list[SubscriptionOut]])
def list_all_subscriptions(
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    items, meta = SubscriptionService(db).list_all_subscriptions(params)
    return {"success": True, "message": "Subscriptions fetched successfully.", "data": items, "meta": meta}


@router.patch("/{subscription_id}/toggle-status", response_model=SuccessResponse[SubscriptionOut])
def toggle_subscription_status(
    subscription_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    sub = SubscriptionService(db).toggle_subscription_status(subscription_id)
    return {"success": True, "message": "Subscription status toggled successfully.", "data": sub}
