from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VehicleCreate(BaseModel):
    plate_number: str = Field(..., min_length=1, max_length=30)
    vehicle_type: Optional[str] = Field(default=None, max_length=50)
    brand: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=30)
    customer_id: Optional[int] = Field(
        default=None, description="Only used by Admin/Staff; Customers default to their own profile."
    )


class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = Field(default=None, min_length=1, max_length=30)
    vehicle_type: Optional[str] = Field(default=None, max_length=50)
    brand: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=30)


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    plate_number: str
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
