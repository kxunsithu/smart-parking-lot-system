"""Pydantic schemas for parking session start, book, finish, and output."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.car import CarOut


class ParkingSessionStart(BaseModel):
    """Direct start (used by staff/admin only) — immediately ACTIVE."""
    car_id: int
    slot_id: int


class ParkingSessionBook(BaseModel):
    """Customer booking — creates an ACTIVE session with a calculated fee."""
    car_id: int
    slot_id: int
    start_time: datetime = Field(..., description="Planned parking start time (UTC)")
    end_time: datetime = Field(..., description="Planned parking end time (UTC)")

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


class SessionCustomerInfo(BaseModel):
    """Minimal customer (user) info embedded in a parking session response."""
    id: int
    name: str
    email: str
    phone: Optional[str] = None


class ParkingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    car_id: int
    slot_id: int
    slot_number: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None  # minutes
    fee: Optional[float] = None
    status: str
    car: Optional[CarOut] = None
    customer: Optional[SessionCustomerInfo] = None
