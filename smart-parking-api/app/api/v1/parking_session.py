"""Parking session endpoints: book (customer), confirm payment, start (staff), list, get, finish."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_session import (
    ParkingSessionBook,
    ParkingSessionFinish,
    ParkingSessionOut,
    ParkingSessionStart,
)
from app.schemas.payment import PaymentOut
from app.services.parking_session_service import ParkingSessionService

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])


class BookingResponse(ParkingSessionOut):
    """Session + pre-calculated fee returned when booking."""
    pass


# ─── Customer booking flow ────────────────────────────────────────────────────

@router.post(
    "/book",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Customer: book a session with start/end time (creates ACTIVE session + PAID payment)",
)
def book_session(
    payload: ParkingSessionBook,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session, payment = ParkingSessionService(db).book_session(payload, current_user)
    return {
        "success": True,
        "message": f"Session booked and activated successfully. Calculated fee: {session.fee:.2f} MMK.",
        "data": session,
    }


# ─── Staff / Admin direct start ───────────────────────────────────────────────

@router.post(
    "/start",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Staff/Admin: directly start a session (immediately ACTIVE, no payment step)",
)
def start_session(
    payload: ParkingSessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).start_session(payload, current_user)
    return {"success": True, "message": "Parking session started.", "data": session}


# ─── Shared endpoints ─────────────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[list[ParkingSessionOut]])
def list_sessions(
    status_: str | None = Query(default=None, alias="status"),
    vehicle_id: int | None = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = ParkingSessionService(db).list_sessions(
        params, status=status_, vehicle_id=vehicle_id, current_user=current_user
    )
    return {"success": True, "message": "Parking sessions fetched successfully.", "data": items, "meta": meta}


@router.get("/{session_id}", response_model=SuccessResponse[ParkingSessionOut])
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).get_by_id(session_id)
    return {"success": True, "message": "Parking session fetched successfully.", "data": session}


@router.patch("/{session_id}/finish", response_model=SuccessResponse[ParkingSessionOut])
def finish_session(
    session_id: int,
    payload: ParkingSessionFinish = ParkingSessionFinish(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).finish_session(session_id, payload, current_user)
    return {"success": True, "message": "Parking session finished.", "data": session}
