"""Pydantic schemas for payments."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    parking_session_id: int
    customer_id: Optional[int] = None
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parking_session_id: int
    customer_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus
