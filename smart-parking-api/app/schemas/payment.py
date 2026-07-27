from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    parking_session_id: int
    reservation_id: Optional[int] = None
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH
    customer_id: Optional[int] = Field(
        default=None, description="Only used by Admin/Staff; Customers default to their own profile."
    )


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parking_session_id: int
    customer_id: int
    reservation_id: Optional[int] = None
    amount: float
    payment_method: str
    status: str
    paid_at: datetime
