from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import SlotStatus


class ParkingSlotCreate(BaseModel):
    floor_id: int
    slot_number: str = Field(..., min_length=1, max_length=20)
    section: Optional[str] = Field(default=None, max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ParkingSlotUpdate(BaseModel):
    slot_number: Optional[str] = Field(default=None, min_length=1, max_length=20)
    section: Optional[str] = Field(default=None, max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ParkingSlotStatusUpdate(BaseModel):
    status: SlotStatus


class ParkingSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    floor_id: int
    slot_number: str
    section: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
