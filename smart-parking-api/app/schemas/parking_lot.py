from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ParkingLotCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    type: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_map_url: Optional[str] = None
    owner_id: Optional[int] = Field(
        default=None, description="Only used by Admin; Owners default to their own owner profile."
    )


class ParkingLotUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    type: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_map_url: Optional[str] = None


class ParkingLotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    type: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_map_url: Optional[str] = None
    total_slots: int
    created_at: datetime
