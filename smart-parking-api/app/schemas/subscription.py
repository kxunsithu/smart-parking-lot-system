from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    duration_months: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    max_parking_lots: int = Field(..., gt=0)
    max_staff: int = Field(..., gt=0)
    is_active: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    duration_months: int | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)
    max_parking_lots: int | None = Field(None, gt=0)
    max_staff: int | None = Field(None, gt=0)
    is_active: bool | None = None


class SubscriptionPlanOut(SubscriptionPlanBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SubscriptionBase(BaseModel):
    plan_id: int
    start_date: datetime
    end_date: datetime
    status: str = "active"
    payment_status: str = "pending"


class SubscriptionCreate(SubscriptionBase):
    parking_owner_id: int
    amount_paid: float | None = None


class SubscriptionUpdate(BaseModel):
    status: str | None = None
    payment_status: str | None = None
    amount_paid: float | None = None
    payment_date: datetime | None = None


class SubscriptionOut(SubscriptionBase):
    id: int
    parking_owner_id: int
    amount_paid: float | None = None
    payment_date: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    plan: SubscriptionPlanOut | None = None

    class Config:
        from_attributes = True
