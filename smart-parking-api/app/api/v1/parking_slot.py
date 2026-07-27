"""Parking Slot CRUD and status update endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_slot import (
    ParkingSlotCreate,
    ParkingSlotOut,
    ParkingSlotStatusUpdate,
    ParkingSlotUpdate,
)
from app.services.parking_slot_service import ParkingSlotService

router = APIRouter(prefix="/parking-slots", tags=["Parking Slots"])


@router.post(
    "",
    response_model=SuccessResponse[ParkingSlotOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def create_slot(payload: ParkingSlotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    slot = ParkingSlotService(db).create_slot(payload, current_user)
    return {"success": True, "message": "Parking slot created successfully.", "data": slot}


@router.get("", response_model=SuccessResponse[list[ParkingSlotOut]])
def list_slots(
    floor_id: Optional[int] = Query(default=None),
    status_: Optional[str] = Query(default=None, alias="status"),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = ParkingSlotService(db).list_slots(params, floor_id=floor_id, status=status_)
    return {"success": True, "message": "Parking slots fetched successfully.", "data": items, "meta": meta}


@router.get("/{slot_id}", response_model=SuccessResponse[ParkingSlotOut])
def get_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = ParkingSlotService(db).get_by_id(slot_id)
    return {"success": True, "message": "Parking slot fetched successfully.", "data": slot}


@router.put(
    "/{slot_id}",
    response_model=SuccessResponse[ParkingSlotOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def update_slot(
    slot_id: int,
    payload: ParkingSlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slot = ParkingSlotService(db).update_slot(slot_id, payload, current_user)
    return {"success": True, "message": "Parking slot updated successfully.", "data": slot}


@router.patch(
    "/{slot_id}/status",
    response_model=SuccessResponse[ParkingSlotOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER, RoleName.STAFF))],
)
def update_slot_status(
    slot_id: int,
    payload: ParkingSlotStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slot = ParkingSlotService(db).update_status(slot_id, payload.status, current_user)
    return {"success": True, "message": "Parking slot status updated successfully.", "data": slot}


@router.delete(
    "/{slot_id}",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def delete_slot(slot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ParkingSlotService(db).delete_slot(slot_id, current_user)
    return {"success": True, "message": "Parking slot deleted successfully.", "data": None}
