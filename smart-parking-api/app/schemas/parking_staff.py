from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserOut


class ParkingStaffCreate(BaseModel):
    """Used by Owner/Admin to create Staff (creates User + ParkingStaff)."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=20)
    parking_lot_id: int
    employee_code: Optional[str] = Field(default=None, max_length=50)
    position: Optional[str] = Field(default=None, max_length=50)


class ParkingStaffUpdate(BaseModel):
    parking_lot_id: Optional[int] = None
    employee_code: Optional[str] = Field(default=None, max_length=50)
    position: Optional[str] = Field(default=None, max_length=50)


class ParkingStaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    parking_lot_id: int
    employee_code: Optional[str] = None
    position: Optional[str] = None
    user: Optional[UserOut] = None
