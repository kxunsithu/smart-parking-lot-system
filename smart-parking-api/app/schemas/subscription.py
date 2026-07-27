from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    per_slot_price: float = Field(..., gt=0)
    is_active: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    per_slot_price: float | None = Field(None, gt=0)
    is_active: bool | None = None


class SubscriptionPlanOut(SubscriptionPlanBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SubscriptionBase(BaseModel):
    plan_id: int
    total_slots: int = Field(..., gt=0)
    total_price: float = Field(..., gt=0)
    status: str = "active"


class SubscriptionCreate(SubscriptionBase):
    parking_owner_id: int


class SubscriptionUpdate(BaseModel):
    status: str | None = None


class SubscriptionOut(SubscriptionBase):
    id: int
    parking_owner_id: int
    created_at: datetime
    updated_at: datetime | None = None
    plan: SubscriptionPlanOut | None = None

    class Config:
        from_attributes = True


class SubscriptionPurchaseRequest(BaseModel):
    plan_id: int
    total_slots: int = Field(..., gt=0)
