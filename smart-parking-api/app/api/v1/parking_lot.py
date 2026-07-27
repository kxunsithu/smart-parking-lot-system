"""Parking Lot CRUD, search, and filter endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_lot import ParkingLotCreate, ParkingLotOut, ParkingLotUpdate
from app.services.parking_lot_service import ParkingLotService

router = APIRouter(prefix="/parking-lots", tags=["Parking Lots"])


@router.post(
    "",
    response_model=SuccessResponse[ParkingLotOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def create_lot(payload: ParkingLotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = ParkingLotService(db).create_lot(payload, current_user)
    return {"success": True, "message": "Parking lot created successfully.", "data": lot}


@router.get("", response_model=SuccessResponse[list[ParkingLotOut]])
def list_lots(
    type: Optional[str] = Query(default=None),
    owner_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = ParkingLotService(db).list_lots(params, type_=type, owner_id=owner_id)
    return {"success": True, "message": "Parking lots fetched successfully.", "data": items, "meta": meta}


@router.get("/{lot_id}", response_model=SuccessResponse[ParkingLotOut])
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    lot = ParkingLotService(db).get_by_id(lot_id)
    return {"success": True, "message": "Parking lot fetched successfully.", "data": lot}


@router.put(
    "/{lot_id}",
    response_model=SuccessResponse[ParkingLotOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def update_lot(
    lot_id: int,
    payload: ParkingLotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lot = ParkingLotService(db).update_lot(lot_id, payload, current_user)
    return {"success": True, "message": "Parking lot updated successfully.", "data": lot}


@router.delete(
    "/{lot_id}",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def delete_lot(lot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ParkingLotService(db).delete_lot(lot_id, current_user)
    return {"success": True, "message": "Parking lot deleted successfully.", "data": None}
