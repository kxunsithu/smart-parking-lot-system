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
    wallet_payment_reference: Optional[str] = None
    wallet_payment_url: Optional[str] = None
    wallet_transaction_number: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
