"""Parking Owner management endpoints (managed by Admin)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_owner import ParkingOwnerOut, ParkingOwnerUpdate
from app.services.parking_owner_service import ParkingOwnerService

router = APIRouter(prefix="/parking-owners", tags=["Parking Owners"])


@router.get(
    "",
    response_model=SuccessResponse[list[ParkingOwnerOut]],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def list_owners(
    is_active: bool | None = Query(default=None),
    is_verified: bool | None = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = ParkingOwnerService(db).list_owners(
        params, is_active=is_active, is_verified=is_verified
    )
    return {"success": True, "message": "Parking owners fetched successfully.", "data": items, "meta": meta}


@router.get("/me", response_model=SuccessResponse[ParkingOwnerOut], dependencies=[Depends(require_roles(RoleName.OWNER))])
def get_my_owner_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    owner = ParkingOwnerService(db).get_by_user_id(current_user.id)
    return {"success": True, "message": "Owner profile fetched successfully.", "data": owner}


@router.get(
    "/{owner_id}",
    response_model=SuccessResponse[ParkingOwnerOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def get_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = ParkingOwnerService(db).get_by_id(owner_id)
    return {"success": True, "message": "Parking owner fetched successfully.", "data": owner}


@router.put(
    "/{owner_id}",
    response_model=SuccessResponse[ParkingOwnerOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def update_owner(owner_id: int, payload: ParkingOwnerUpdate, db: Session = Depends(get_db)):
    owner = ParkingOwnerService(db).update_owner(owner_id, payload)
    return {"success": True, "message": "Parking owner updated successfully.", "data": owner}


@router.delete(
    "/{owner_id}",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def delete_owner(owner_id: int, db: Session = Depends(get_db)):
    ParkingOwnerService(db).delete_owner(owner_id)
    return {"success": True, "message": "Parking owner deleted successfully.", "data": None}


@router.patch(
    "/{owner_id}/toggle-status",
    response_model=SuccessResponse[ParkingOwnerOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def toggle_owner_status(owner_id: int, db: Session = Depends(get_db)):
    owner = ParkingOwnerService(db).toggle_owner_status(owner_id)
    return {"success": True, "message": "Parking owner status toggled successfully.", "data": owner}
