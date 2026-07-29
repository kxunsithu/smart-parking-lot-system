"""Pydantic schemas for parking session start, finish, and output."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ParkingSessionStart(BaseModel):
    vehicle_id: int
    slot_id: int


class ParkingSessionFinish(BaseModel):
    rate_per_hour: Optional[float] = Field(
        default=None,
        gt=0,
        description="Optional override for hourly rate; defaults to system setting.",
    )


class ParkingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    slot_id: int
    start_time: datetime
    end_time: Optional[datetime]
    duration: Optional[int]  # minutes
    fee: Optional[float]
    status: str
