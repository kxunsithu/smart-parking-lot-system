"""Parking session endpoints: book (customer), pay (wallet), list, get, finish."""
from fastapi import APIRouter, Body, Depends, Query, status
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
from app.schemas.payment import (
    PaymentConfirmRequest,
    PaymentInitiateRequest,
    PaymentOut,
    PendingPaymentOut,
)
from app.services.parking_session_service import ParkingSessionService, serialize_session
from app.services.payment_service import PaymentService
from app.services.wallet_payment_client import WalletPaymentClient, get_wallet_client

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])


# ─── Customer booking flow ────────────────────────────────────────────────────

@router.post(
    "/book",
    response_model=SuccessResponse[ParkingSessionOut],
    status_code=status.HTTP_201_CREATED,
    summary="Customer: book a session (creates PENDING session; becomes ACTIVE after wallet payment)",
)
def book_session(
    payload: ParkingSessionBook,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ParkingSessionService(db).book_session(payload, current_user)
    return {
        "success": True,
        "message": (
            f"Session booked. Estimated fee: {session.fee:.2f} MMK. "
            "Please complete the wallet payment to activate the session."
        ),
        "data": serialize_session(session),
    }


# ─── Wallet payment flow (session becomes ACTIVE only after payment) ──────────

@router.post(
    "/{session_id}/pay/initiate",
    response_model=SuccessResponse[PendingPaymentOut],
    status_code=status.HTTP_201_CREATED,
    summary="Customer: request a wallet payment for a PENDING session (returns OTP)",
)
def initiate_session_payment(
    session_id: int,
    payload: PaymentInitiateRequest = Body(default=PaymentInitiateRequest()),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
):
    service = ParkingSessionService(db)
    session = service.get_by_id(session_id)
    payment = PaymentService(db, wallet_client).initiate_session_payment(
        session, current_user, wallet_phone=payload.wallet_phone
    )
    return {
        "success": True,
        "message": "Wallet payment initiated. Enter the OTP and your PIN to confirm.",
        "data": payment,
    }


@router.post(
    "/{session_id}/pay/confirm",
    response_model=SuccessResponse[dict],
    summary="Customer: confirm the wallet payment (OTP + PIN) to activate the session",
)
def confirm_session_payment(
    session_id: int,
    payload: PaymentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
):
    service = ParkingSessionService(db)
    session = service.get_by_id(session_id)
    payment, session = PaymentService(db, wallet_client).confirm_session_payment(
        session, payload, current_user
    )
    return {
        "success": True,
        "message": "Payment successful. Your parking session is now active.",
        "data": {
            "payment": PaymentOut.model_validate(payment).model_dump(mode="json"),
            "session": serialize_session(session),
        },
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
