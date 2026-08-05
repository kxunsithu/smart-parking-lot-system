"""Hosted wallet payment callback.

The digital wallet backend redirects the customer's browser to this endpoint
(after OTP + PIN are collected on its hosted payment page) with the wallet-side
reference, our order reference, status and a message. We re-verify the status
against the wallet server-to-server, finalize the local payment, and redirect
the browser to the matching frontend result page (customer or management app).
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.database.session import get_db
from app.services.payment_service import PaymentService
from app.services.wallet_payment_client import WalletPaymentClient, get_wallet_client

router = APIRouter(prefix="/wallet-payment", tags=["Wallet Payment"])


@router.get(
    "/callback",
    summary="Browser callback from the wallet hosted payment page",
    include_in_schema=False,
)
def wallet_payment_callback(
    reference: str = Query("", description="Wallet-side payment reference (e.g. PAY-XXX)"),
    order_reference: str = Query("", description="Parking-side reference (e.g. PP-XXX)"),
    app: str = Query("", description="Frontend hint: customer | management"),
    status: str = Query("", description="Wallet result: success | failed"),
    message: str = Query("", description="Human readable result from the wallet"),
    db: Session = Depends(get_db),
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
) -> RedirectResponse:
    service = PaymentService(db, wallet_client)
    pending = service.find_pending_for_callback(order_reference or None, reference or None)

    if pending is None:
        completed = service.find_completed_payment(order_reference or None, reference or None)
        if completed:
            target = service.redirect_url_for(completed, "completed")
        else:
            target = service.redirect_url_for_unknown(app, "failed")
    else:
        try:
            payment = service.finalize_wallet_payment(pending)
            target = service.redirect_url_for(payment, "completed")
        except (BadRequestException, NotFoundException) as exc:
            target = service.redirect_url_for(pending, "failed")

    return RedirectResponse(url=target, status_code=303)
