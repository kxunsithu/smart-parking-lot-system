"""External wallet transaction records (payments created after wallet completion)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.payment import PaymentListOut
from app.services.payment_service import PaymentService
from app.services.wallet_payment_client import WalletPaymentClient, get_wallet_client

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=SuccessResponse[list[PaymentListOut]])
def list_wallet_payments(
    params: PaginationParams = Depends(pagination_params),
    kind: str | None = Query(default=None, alias="kind", description="Filter by payment kind: 'subscription' or 'session'."),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER, RoleName.CUSTOMER)),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
):
    """List external wallet transaction records.

    Admins see every payment; owners see their own wallet's received parking
    fees plus their subscription payments.
    """
    items, meta = PaymentService(db, wallet_client).list_payments(params, current_user, kind=kind)
    return {
        "success": True,
        "message": "Wallet payments fetched successfully.",
        "data": items,
        "meta": meta,
    }
