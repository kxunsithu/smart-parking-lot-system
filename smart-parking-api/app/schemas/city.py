"""Pydantic schemas for the City resource."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_mm: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    is_active: bool = True


class CityCreate(CityBase):
    pass


class CityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    name_mm: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CityOut(CityBase):
    id: int
    image_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
