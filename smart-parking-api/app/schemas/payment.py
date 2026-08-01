"""Pydantic schemas for wallet payments."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
    wallet_payment_id: Optional[int] = None
    amount: float
    fee: float
    total: float
    status: str
    message: Optional[str] = None
    wallet_transaction_id: Optional[int] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
