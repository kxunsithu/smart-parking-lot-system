from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import PaymentMethod, PaymentStatus


# Subscription Payment Schemas
class SubscriptionPaymentCreate(BaseModel):
    subscription_id: int
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH


class SubscriptionPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime


# Parking Session Payment Schemas
class ParkingSessionPaymentCreate(BaseModel):
    parking_session_id: int
    customer_id: int
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH


class ParkingSessionPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parking_session_id: int
    customer_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime


# Reservation Payment Schemas
class ReservationPaymentCreate(BaseModel):
    reservation_id: int
    customer_id: int
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH


class ReservationPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reservation_id: int
    customer_id: int
    amount: float
    payment_method: str
    status: str
    paid_at: datetime


# Generic Payment Status Update (can be used for all types)
class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus
