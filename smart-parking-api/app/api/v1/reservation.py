"""Reservation endpoints: create, list, update, cancel/confirm/complete."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.reservation import (
    ReservationCreate,
    ReservationOut,
    ReservationStatusUpdate,
    ReservationUpdate,
)
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("", response_model=SuccessResponse[ReservationOut], status_code=status.HTTP_201_CREATED)
def create_reservation(
    payload: ReservationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    reservation = ReservationService(db).create_reservation(payload, current_user)
    return {"success": True, "message": "Reservation created successfully.", "data": reservation}


@router.get("", response_model=SuccessResponse[list[ReservationOut]])
def list_reservations(
    status_: Optional[str] = Query(default=None, alias="status"),
    customer_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = ReservationService(db).list_reservations(
        params, current_user, status=status_, customer_id=customer_id
    )
    return {"success": True, "message": "Reservations fetched successfully.", "data": items, "meta": meta}


@router.get("/{reservation_id}", response_model=SuccessResponse[ReservationOut])
def get_reservation(reservation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reservation = ReservationService(db).get_owned_reservation(reservation_id, current_user)
    return {"success": True, "message": "Reservation fetched successfully.", "data": reservation}


@router.put("/{reservation_id}", response_model=SuccessResponse[ReservationOut])
def update_reservation(
    reservation_id: int,
    payload: ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = ReservationService(db).update_reservation(reservation_id, payload, current_user)
    return {"success": True, "message": "Reservation updated successfully.", "data": reservation}


@router.patch("/{reservation_id}/status", response_model=SuccessResponse[ReservationOut])
def update_reservation_status(
    reservation_id: int,
    payload: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reservation = ReservationService(db).update_status(reservation_id, payload.status, current_user)
    return {"success": True, "message": "Reservation status updated successfully.", "data": reservation}
