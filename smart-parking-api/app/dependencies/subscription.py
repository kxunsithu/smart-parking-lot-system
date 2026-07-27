"""Subscription dependency for checking active subscriptions."""
from fastapi import Depends, HTTPException, status

from app.core.exceptions import UnauthorizedException
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.services.subscription_service import SubscriptionService


def require_active_subscription(current_user: User = Depends(get_current_user)):
    """Dependency to check if current user (owner) has active subscription."""
    if current_user.role.name != "OWNER":
        return current_user
    
    from app.database.session import get_db
    db = next(get_db())
    
    try:
        owner_repo = ParkingOwnerRepository(db)
        owner = owner_repo.get_by_user_id(current_user.id)
        
        if not owner:
            raise UnauthorizedException("No parking owner profile found")
        
        subscription_service = SubscriptionService(db)
        status_info = subscription_service.check_subscription_status(owner.id)
        
        if not status_info["has_subscription"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Subscription required",
                    "message": status_info["message"],
                    "status": status_info["status"],
                },
            )
        
        return current_user
    finally:
        db.close()
