"""FastAPI router for camera-based parking slot detection.

This endpoint is called exclusively by the standalone camera detection service.
Authentication uses a shared API key (X-Camera-API-Key header) — NOT a user JWT.
This keeps camera traffic separate from regular user auth flows.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.session import get_db
from app.schemas.camera_detection import CameraDetectionPayload, CameraDetectionResponse
from app.schemas.common import SuccessResponse
from app.services.camera_detection_service import CameraDetectionService

router = APIRouter(prefix="/camera", tags=["Camera Detection"])


def verify_camera_api_key(x_camera_api_key: str = Header(...)) -> None:
    """Dependency: validates the shared API key sent by the camera service."""
    if x_camera_api_key != settings.CAMERA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing camera API key.",
        )


@router.post(
    "/detect",
    response_model=SuccessResponse[CameraDetectionResponse],
    summary="Report parking slot statuses from camera detection",
    description=(
        "Called by the camera detection service to bulk-update parking slot statuses. "
        "Requires the `X-Camera-API-Key` header with the shared secret. "
        "RESERVED slots are protected and will not be overwritten."
    ),
)
def report_detection(
    payload: CameraDetectionPayload,
    db: Session = Depends(get_db),
    _: None = Depends(verify_camera_api_key),
) -> dict:
    result = CameraDetectionService(db).process_detection(payload)
    return {
        "success": True,
        "message": f"Detection processed: {result.updated_count} slot(s) updated.",
        "data": result,
    }
