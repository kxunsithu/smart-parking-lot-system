"""Pydantic schemas for parking session start, book, finish, and output."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ParkingSessionStart(BaseModel):
    """Direct start (used by staff/admin only) — immediately ACTIVE."""
    vehicle_id: int
    slot_id: int


class ParkingSessionBook(BaseModel):
    """Customer booking — creates PENDING session with upfront payment."""
    vehicle_id: int
    slot_id: int
    start_time: datetime = Field(..., description="Planned parking start time (UTC)")
    end_time: datetime = Field(..., description="Planned parking end time (UTC)")
    payment_method: str = Field(default="CASH", description="Payment method: CASH, KBZPAY, WAVEPAY, AYAPAY, UABPAY")

    @model_validator(mode="after")
    def validate_times(self) -> "ParkingSessionBook":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ParkingSessionFinish(BaseModel):
    rate_per_hour: Optional[float] = Field(
        default=None,
        gt=0,
        description="Optional override for hourly rate; defaults to lot rate or system setting.",
    )


class ParkingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    slot_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None  # minutes
    fee: Optional[float] = None
    status: str
