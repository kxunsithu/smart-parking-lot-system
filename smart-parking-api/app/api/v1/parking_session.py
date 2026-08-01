"""Parking session endpoints: book (customer), start (staff), list, get, finish."""
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
from app.services.parking_session_service import ParkingSessionService, serialize_session

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])


# ─── Customer booking flow ────────────────────────────────────────────────────

@router.post(
    "/book",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Customer: book a session with start/end time (creates ACTIVE session with calculated fee)",
)
def book_session(
    payload: ParkingSessionBook,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).book_session(payload, current_user)
    return {
        "success": True,
        "message": f"Session booked and activated successfully. Calculated fee: {session.fee:.2f} MMK.",
        "data": serialize_session(session),
    }


# ─── Staff / Admin direct start ───────────────────────────────────────────────

@router.post(
    "/start",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Disabled: Only customers can create parking sessions",
)
def start_session(
    payload: ParkingSessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can create parking sessions.")


# ─── Shared endpoints ─────────────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[list[ParkingSessionOut]])
def list_sessions(
    status_: str | None = Query(default=None, alias="status"),
    car_id: int | None = Query(default=None),
    slot_id: int | None = Query(default=None),
    plate_number: str | None = Query(default=None, description="Filter by unique car license plate."),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = ParkingSessionService(db).list_sessions(
        params,
        status=status_,
        car_id=car_id,
        slot_id=slot_id,
        plate_number=plate_number,
        current_user=current_user,
    )
    return {"success": True, "message": "Parking sessions fetched successfully.", "data": items, "meta": meta}


@router.get("/{session_id}", response_model=SuccessResponse[ParkingSessionOut])
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).get_by_id(session_id)
    return {"success": True, "message": "Parking session fetched successfully.", "data": serialize_session(session)}


@router.patch("/{session_id}/finish", response_model=SuccessResponse[ParkingSessionOut])
def finish_session(
    session_id: int,
    payload: ParkingSessionFinish = ParkingSessionFinish(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).finish_session(session_id, payload, current_user)
    return {"success": True, "message": "Parking session finished.", "data": serialize_session(session)}
