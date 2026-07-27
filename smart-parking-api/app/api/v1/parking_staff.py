"""Parking Staff management endpoints (created by Owner or Admin)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_staff import ParkingStaffCreate, ParkingStaffOut, ParkingStaffUpdate
from app.services.parking_staff_service import ParkingStaffService

router = APIRouter(
    prefix="/parking-staff",
    tags=["Parking Staff"],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)


@router.post("", response_model=SuccessResponse[ParkingStaffOut], status_code=status.HTTP_201_CREATED)
def create_staff(payload: ParkingStaffCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = ParkingStaffService(db).create_staff(payload, current_user)
    return {"success": True, "message": "Parking staff created successfully.", "data": staff}


@router.get("", response_model=SuccessResponse[list[ParkingStaffOut]])
def list_staff(
    parking_lot_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = ParkingStaffService(db).list_staff(params, parking_lot_id=parking_lot_id)
    return {"success": True, "message": "Parking staff fetched successfully.", "data": items, "meta": meta}


@router.get("/{staff_id}", response_model=SuccessResponse[ParkingStaffOut])
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = ParkingStaffService(db).get_by_id(staff_id)
    return {"success": True, "message": "Parking staff fetched successfully.", "data": staff}


@router.put("/{staff_id}", response_model=SuccessResponse[ParkingStaffOut])
def update_staff(
    staff_id: int,
    payload: ParkingStaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    staff = ParkingStaffService(db).update_staff(staff_id, payload, current_user)
    return {"success": True, "message": "Parking staff updated successfully.", "data": staff}


@router.delete("/{staff_id}", response_model=SuccessResponse[None])
def delete_staff(staff_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ParkingStaffService(db).delete_staff(staff_id, current_user)
    return {"success": True, "message": "Parking staff deleted successfully.", "data": None}
