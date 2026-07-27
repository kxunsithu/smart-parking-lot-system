"""Parking Owner management endpoints (created and managed by Admin)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_owner import ParkingOwnerCreate, ParkingOwnerOut, ParkingOwnerUpdate
from app.services.parking_owner_service import ParkingOwnerService

router = APIRouter(prefix="/parking-owners", tags=["Parking Owners"])


@router.post(
    "",
    response_model=SuccessResponse[ParkingOwnerOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def create_owner(payload: ParkingOwnerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    owner = ParkingOwnerService(db).create_owner(payload, created_by=current_user.id)
    return {"success": True, "message": "Parking owner created successfully.", "data": owner}


@router.get(
    "",
    response_model=SuccessResponse[list[ParkingOwnerOut]],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def list_owners(params: PaginationParams = Depends(pagination_params), db: Session = Depends(get_db)):
    items, meta = ParkingOwnerService(db).list_owners(params)
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
