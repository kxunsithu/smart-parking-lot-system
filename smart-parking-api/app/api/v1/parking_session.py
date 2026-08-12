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
    SessionPaymentConfirmRequest,
    SessionPaymentInitiateRequest,
)
from app.services.parking_session_service import ParkingSessionService, serialize_session
from app.services.payment_service import PaymentService
from app.services.wallet_payment_client import WalletPaymentClient, get_wallet_client

router = APIRouter(prefix="/parking-sessions", tags=["Parking Sessions"])


# ─── Customer booking flow ────────────────────────────────────────────────────

@router.post(
    "/book",
    response_model=SuccessResponse[PendingPaymentOut],
    status_code=status.HTTP_201_CREATED,
    summary="Customer: validate booking and initiate wallet payment (session created ACTIVE after payment)",
)
def book_session(
    payload: SessionPaymentInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
):
    """Book a parking slot and initiate wallet payment in one atomic step.

    No ParkingSession record is created. The session is created as ACTIVE only
    after the wallet confirms payment (via /pay/confirm or the hosted-page callback).
    """
    pending = PaymentService(db, wallet_client).initiate_session_payment_v2(
        car_id=payload.car_id,
        slot_id=payload.slot_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        current_user=current_user,
        wallet_phone=payload.wallet_phone,
    )
    return {
        "success": True,
        "message": (
            f"Booking initiated. Estimated fee: {pending.amount:.2f} MMK. "
            "Enter the OTP and your PIN to confirm payment, or complete it on the wallet page."
        ),
        "data": pending,
    }


# ─── Wallet payment confirmation (new reference-based flow) ───────────────────

@router.post(
    "/pay/confirm",
    response_model=SuccessResponse[dict],
    summary="Customer: confirm the wallet payment by reference (OTP + PIN) — creates ACTIVE session",
)
def confirm_session_payment_by_reference(
    payload: SessionPaymentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
):
    """Confirm a pending session payment by reference.

    On success, the ParkingSession is created with status ACTIVE.
    """
    from app.schemas.payment import PaymentConfirmRequest as _Confirm
    confirm_payload = _Confirm(otp_code=payload.otp_code, pin=payload.pin)
    payment, session = PaymentService(db, wallet_client).confirm_session_payment_by_reference(
        reference=payload.reference,
        payload=confirm_payload,
        current_user=current_user,
    )
    return {
        "success": True,
        "message": "Payment successful. Your parking session is now active.",
        "data": {
            "payment": PaymentOut.model_validate(payment).model_dump(mode="json"),
            "session": serialize_session(session),
        },
    }


# ─── Legacy session-id-based payment flow (backward compat) ──────────────────

@router.post(
    "/{session_id}/pay/initiate",
    response_model=SuccessResponse[PendingPaymentOut],
    status_code=status.HTTP_201_CREATED,
    summary="[Legacy] Initiate wallet payment for an existing PENDING session",
    deprecated=True,
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
    summary="[Legacy] Confirm wallet payment for an existing PENDING session",
    deprecated=True,
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
