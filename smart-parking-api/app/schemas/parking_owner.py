from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserOut


class ParkingOwnerUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=100)


class ParkingOwnerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    company_name: Optional[str] = None
    user: Optional[UserOut] = None
