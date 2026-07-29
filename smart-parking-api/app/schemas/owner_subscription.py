"""Schemas for OwnerSubscription."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.package import PackageOut


class SubscriptionPurchase(BaseModel):
    package_id: int
    owner_id: Optional[int] = None  # Admin can specify; Owner uses their own
    payment_method: str = "CASH"
    transaction_ref: Optional[str] = None


class SubscriptionOut(BaseModel):
    id: int
    owner_id: int
    package_id: int
    started_at: datetime
    expires_at: datetime
    status: str
    payment_method: str
    amount: float
    transaction_ref: Optional[str] = None
    created_at: datetime
    package: Optional[PackageOut] = None

    model_config = {"from_attributes": True}
