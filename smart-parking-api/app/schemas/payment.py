"""Pydantic schemas for digital wallet payments."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentInitiateRequest(BaseModel):
    """Optional wallet phone number to use for the wallet payment.

    If omitted, the payer's profile phone number is used as fallback.
    """
    wallet_phone: Optional[str] = Field(
        default=None,
        description="Wallet account phone number to charge. Falls back to profile phone if omitted.",
    )


class PaymentConfirmRequest(BaseModel):
    """OTP + PIN used to authorize a wallet payment in the digital wallet system."""
    otp_code: str = Field(..., min_length=6, max_length=6, description="One-time password received from the wallet app.")
    pin: str = Field(..., min_length=4, max_length=4, description="Wallet PIN (4 digits).")


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    session_id: Optional[int] = None
    subscription_id: Optional[int] = None
    wallet_account_id: Optional[int] = None
    amount: float
    fee: float
    total: float
    status: str
    message: Optional[str] = None
    receiver_phone: Optional[str] = None
    wallet_payment_reference: Optional[str] = None
    wallet_payment_url: Optional[str] = None
    wallet_transaction_number: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime


class PendingPaymentOut(BaseModel):
    """A wallet payment that has been initiated but not yet completed.

    No transaction record exists yet; the real Payment is created only when the
    external wallet confirms the payment is completed.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    session_id: Optional[int] = None
    subscription_id: Optional[int] = None
    wallet_account_id: Optional[int] = None
    amount: float
    fee: float
    total: float
    status: str = "PENDING"
    message: Optional[str] = None
    wallet_payment_reference: Optional[str] = None
    wallet_payment_url: Optional[str] = None
    created_at: datetime


class PaymentListOut(BaseModel):
    """One row in the wallet transaction list (external-system payments).

    `kind` is "session" (customer → owner wallet) or "subscription"
    (owner → platform wallet). Context fields are filled depending on the kind.
    `direction` is set for owners only: "received" (parking fees into their
    wallet) or "paid" (subscription fees out of their wallet).
    """
    id: int
    reference: str
    kind: str
    wallet_payment_reference: Optional[str] = None
    wallet_transaction_number: Optional[str] = None
    receiver_phone: Optional[str] = None
    payer_name: Optional[str] = None
    payer_phone: Optional[str] = None
    amount: float
    fee: float
    total: float
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    lot_name: Optional[str] = None
    plate_number: Optional[str] = None
    package_name: Optional[str] = None
    owner_name: Optional[str] = None
    direction: Optional[str] = None
