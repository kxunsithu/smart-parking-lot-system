from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserOut


class ParkingStaffCreate(BaseModel):
    """Used by Owner/Admin to create Staff (creates User + ParkingStaff)."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    parking_lot_id: int


class ParkingStaffUpdate(BaseModel):
    parking_lot_id: Optional[int] = None


class ParkingStaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    parking_lot_id: int
    created_by: Optional[int] = None
    user: Optional[UserOut] = None
