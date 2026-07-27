"""Parking Floor CRUD endpoints (per parking lot)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_floor import ParkingFloorCreate, ParkingFloorOut, ParkingFloorUpdate
from app.services.parking_floor_service import ParkingFloorService

router = APIRouter(prefix="/parking-floors", tags=["Parking Floors"])


@router.post(
    "",
    response_model=SuccessResponse[ParkingFloorOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def create_floor(payload: ParkingFloorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    floor = ParkingFloorService(db).create_floor(payload, current_user)
    return {"success": True, "message": "Parking floor created successfully.", "data": floor}


@router.get("", response_model=SuccessResponse[list[ParkingFloorOut]])
def list_floors(
    parking_lot_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = ParkingFloorService(db).list_floors(params, parking_lot_id=parking_lot_id)
    return {"success": True, "message": "Parking floors fetched successfully.", "data": items, "meta": meta}


@router.get("/{floor_id}", response_model=SuccessResponse[ParkingFloorOut])
def get_floor(floor_id: int, db: Session = Depends(get_db)):
    floor = ParkingFloorService(db).get_by_id(floor_id)
    return {"success": True, "message": "Parking floor fetched successfully.", "data": floor}


@router.put(
    "/{floor_id}",
    response_model=SuccessResponse[ParkingFloorOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def update_floor(
    floor_id: int,
    payload: ParkingFloorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    floor = ParkingFloorService(db).update_floor(floor_id, payload, current_user)
    return {"success": True, "message": "Parking floor updated successfully.", "data": floor}


@router.delete(
    "/{floor_id}",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def delete_floor(floor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ParkingFloorService(db).delete_floor(floor_id, current_user)
    return {"success": True, "message": "Parking floor deleted successfully.", "data": None}
