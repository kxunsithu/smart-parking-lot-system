from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class CustomerUpdate(BaseModel):
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    user: Optional[UserOut] = None
