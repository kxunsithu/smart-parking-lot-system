from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ParkingSessionStart(BaseModel):
    vehicle_id: int
    slot_id: int
    reservation_id: Optional[int] = Field(
        default=None, description="If starting a session from a confirmed reservation."
    )


class ParkingSessionFinish(BaseModel):
    rate_per_hour: Optional[float] = Field(
        default=None, description="Override the default hourly rate used to calculate the fee."
    )


class ParkingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    slot_id: int
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    duration: Optional[int] = None
    fee: Optional[float] = None
    status: str
