from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse, build_meta
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get(
    "/",
    response_model=SuccessResponse[list[PaymentOut]],
    status_code=status.HTTP_200_OK,
)
def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pagination = PaginationParams(
        page=page, limit=limit, sort_by=sort_by, order=order, search=search
    )
    items, total = PaymentService(db).list_payments(
        current_user, pagination, payment_method=payment_method
    )
    return {
        "success": True,
        "message": "Payments retrieved successfully.",
        "data": items,
        "meta": build_meta(total, page, limit),
    }


@router.post(
    "/",
    response_model=SuccessResponse[PaymentOut],
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = PaymentService(db).create_payment(payload, current_user)
    return {"success": True, "message": "Payment recorded successfully.", "data": payment}
