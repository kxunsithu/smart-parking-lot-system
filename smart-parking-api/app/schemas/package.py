"""Schemas for Package CRUD."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PackageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    duration_days: int = Field(..., gt=0)
    max_lots: int = Field(default=1, gt=0)
    max_staff: int = Field(default=5, gt=0)


class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    duration_days: Optional[int] = Field(None, gt=0)
    max_lots: Optional[int] = Field(None, gt=0)
    max_staff: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class PackageOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    duration_days: int
    max_lots: int
    max_staff: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
