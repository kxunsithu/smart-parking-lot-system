from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserOut


class ParkingOwnerCreate(BaseModel):
    """Used by Admin to create a new Owner (creates User + ParkingOwner)."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=20)
    company_name: Optional[str] = Field(default=None, max_length=100)
    business_license: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)


class ParkingOwnerUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=100)
    business_license: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)


class ParkingOwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    company_name: Optional[str] = None
    business_license: Optional[str] = None
    address: Optional[str] = None
    user: Optional[UserOut] = None
