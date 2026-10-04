"""Pydantic schemas for camera detection endpoint."""
from typing import List

from pydantic import BaseModel, Field

from app.core.constants import SlotStatus


class SlotDetectionResult(BaseModel):
    """Result for a single slot detected by the camera."""

    slot_id: int = Field(..., description="Parking slot ID in the database")
    detected_status: SlotStatus = Field(
        ..., description="Status detected by the camera (AVAILABLE or OCCUPIED)"
    )


class CameraDetectionPayload(BaseModel):
    """Payload sent by the camera detection service to report slot statuses."""

    camera_id: str = Field(..., description="Unique identifier of the camera")
    slots: List[SlotDetectionResult] = Field(
        ..., min_length=1, description="List of slot detection results from this camera"
    )


class SlotUpdateResult(BaseModel):
    """Outcome of updating a single slot's status."""

    slot_id: int
    slot_number: str
    previous_status: str
    new_status: str
    changed: bool


class CameraDetectionResponse(BaseModel):
    """Summary response after processing a camera detection payload."""

    camera_id: str
    total_slots: int
    updated_count: int
    unchanged_count: int
    results: List[SlotUpdateResult]
