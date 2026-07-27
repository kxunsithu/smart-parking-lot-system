from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ParkingFloorCreate(BaseModel):
    parking_lot_id: int
    floor_name: str = Field(..., min_length=1, max_length=50)


class ParkingFloorUpdate(BaseModel):
    floor_name: Optional[str] = Field(default=None, min_length=1, max_length=50)


class ParkingFloorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parking_lot_id: int
    floor_name: Optional[str] = None
