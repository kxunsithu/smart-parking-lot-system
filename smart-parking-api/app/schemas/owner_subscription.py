"""Schemas for OwnerSubscription."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.package import PackageOut
from app.schemas.parking_owner import ParkingOwnerOut


class SubscriptionPurchase(BaseModel):
    package_id: int
    owner_id: Optional[int] = None  # Admin can specify; Owner uses their own


class SubscriptionOut(BaseModel):
    id: int
    owner_id: int
    package_id: int
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    status: str
    amount: float
    created_at: datetime
    package: Optional[PackageOut] = None
    owner: Optional[ParkingOwnerOut] = None

    model_config = {"from_attributes": True}
