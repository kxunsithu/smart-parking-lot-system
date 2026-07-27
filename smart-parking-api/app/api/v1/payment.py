"""Payment endpoints: create payments by type."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.payment import (
    ParkingSessionPaymentCreate,
    ParkingSessionPaymentOut,
    ReservationPaymentCreate,
    ReservationPaymentOut,
    SubscriptionPaymentCreate,
    SubscriptionPaymentOut,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


# Subscription Payments
@router.post(
    "/subscription",
    response_model=SuccessResponse[SubscriptionPaymentOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def create_subscription_payment(
    payload: SubscriptionPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).create_subscription_payment(payload)
    return {"success": True, "message": "Subscription payment recorded successfully.", "data": payment}


# Parking Session Payments
@router.post(
    "/session",
    response_model=SuccessResponse[ParkingSessionPaymentOut],
    status_code=status.HTTP_201_CREATED,
)
def create_session_payment(
    payload: ParkingSessionPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).create_session_payment(payload, current_user)
    return {"success": True, "message": "Session payment recorded successfully.", "data": payment}


# Reservation Payments
@router.post(
    "/reservation",
    response_model=SuccessResponse[ReservationPaymentOut],
    status_code=status.HTTP_201_CREATED,
)
def create_reservation_payment(
    payload: ReservationPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).create_reservation_payment(payload, current_user)
    return {"success": True, "message": "Reservation payment recorded successfully.", "data": payment}
