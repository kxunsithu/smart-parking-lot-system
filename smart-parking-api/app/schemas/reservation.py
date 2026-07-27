from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import ReservationStatus


class ReservationCreate(BaseModel):
    slot_id: int
    reservation_time: datetime
    customer_id: Optional[int] = Field(
        default=None, description="Only used by Admin/Staff; Customers default to their own profile."
    )


class ReservationUpdate(BaseModel):
    reservation_time: Optional[datetime] = None


class ReservationStatusUpdate(BaseModel):
    status: ReservationStatus


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    slot_id: int
    reservation_time: datetime
    status: str
