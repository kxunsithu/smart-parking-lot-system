"""Parking session endpoints: start, list, get, finish."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_session import ParkingSessionFinish, ParkingSessionOut, ParkingSessionStart
from app.services.parking_session_service import ParkingSessionService

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])


@router.post(
    "/start",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
)
def start_session(
    payload: ParkingSessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).start_session(payload, current_user)
    return {"success": True, "message": "Parking session started.", "data": session}


@router.get("", response_model=SuccessResponse[list[ParkingSessionOut]])
def list_sessions(
    status_: str | None = Query(default=None, alias="status"),
    vehicle_id: int | None = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = ParkingSessionService(db).list_sessions(
        params, status=status_, vehicle_id=vehicle_id
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
