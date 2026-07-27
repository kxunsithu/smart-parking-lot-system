"""Payment endpoints: create payments, list, and update status (refund, etc.)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentStatusUpdate
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=SuccessResponse[PaymentOut], status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payment = PaymentService(db).create_payment(payload, current_user)
    return {"success": True, "message": "Payment recorded successfully.", "data": payment}


@router.get("", response_model=SuccessResponse[list[PaymentOut]])
def list_payments(
    status_: Optional[str] = Query(default=None, alias="status"),
    customer_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = PaymentService(db).list_payments(params, current_user, status=status_, customer_id=customer_id)
    return {"success": True, "message": "Payments fetched successfully.", "data": items, "meta": meta}


@router.get("/{payment_id}", response_model=SuccessResponse[PaymentOut])
def get_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payment = PaymentService(db).get_viewable_payment(payment_id, current_user)
    return {"success": True, "message": "Payment fetched successfully.", "data": payment}


@router.patch(
    "/{payment_id}/status",
    response_model=SuccessResponse[PaymentOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER, RoleName.STAFF))],
)
def update_payment_status(
    payment_id: int,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).update_status(payment_id, payload.status, current_user)
    return {"success": True, "message": "Payment status updated successfully.", "data": payment}
