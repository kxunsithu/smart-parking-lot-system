from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parking_owner import ParkingOwnerOut
from app.schemas.user import UserOut


class ParkingLotCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    google_map_url: Optional[str] = None
    rate_per_hour: Optional[float] = Field(default=None, gt=0, description="Hourly parking rate set by the owner")
    owner_id: Optional[int] = Field(
        default=None, description="Only used by Admin; Owners default to their own owner profile."
    )


class ParkingLotUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    google_map_url: Optional[str] = None
    rate_per_hour: Optional[float] = Field(default=None, gt=0, description="Hourly parking rate set by the owner")


class ParkingLotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    google_map_url: Optional[str] = None
    is_active: bool
    type: str = "PUBLIC"
    rate_per_hour: Optional[float] = None
    created_at: datetime
    owner: Optional[ParkingOwnerOut] = None
    staff_count: int = 0


class ParkingLotWithStaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    google_map_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    owner: Optional[ParkingOwnerOut] = None
    staff_count: int = 0
