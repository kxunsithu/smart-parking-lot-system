"""Role-specific dashboard/statistics endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.dashboard import AdminDashboardOut, OwnerDashboardOut, StaffDashboardOut
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/admin",
    response_model=SuccessResponse[AdminDashboardOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def admin_dashboard(db: Session = Depends(get_db)):
    stats = DashboardService(db).admin_dashboard()
    return {"success": True, "message": "Admin dashboard fetched successfully.", "data": stats}


@router.get(
    "/owner",
    response_model=SuccessResponse[OwnerDashboardOut],
    dependencies=[Depends(require_roles(RoleName.OWNER))],
)
def owner_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = DashboardService(db).owner_dashboard(current_user.id)
    return {"success": True, "message": "Owner dashboard fetched successfully.", "data": stats}


@router.get(
    "/staff",
    response_model=SuccessResponse[StaffDashboardOut],
    dependencies=[Depends(require_roles(RoleName.STAFF))],
)
def staff_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = DashboardService(db).staff_dashboard(current_user.id)
    return {"success": True, "message": "Staff dashboard fetched successfully.", "data": stats}
