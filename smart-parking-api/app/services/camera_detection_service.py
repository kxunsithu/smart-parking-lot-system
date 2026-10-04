"""Business logic for processing camera-based slot detection results."""
from sqlalchemy.orm import Session

from app.core.constants import SlotStatus
from app.models.parking_slot import ParkingSlot
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.schemas.camera_detection import (
    CameraDetectionPayload,
    CameraDetectionResponse,
    SlotDetectionResult,
    SlotUpdateResult,
)


class CameraDetectionService:
    """Processes incoming detection payloads and updates slot statuses in bulk.

    Called exclusively by the camera detection script — NOT by human users.
    Authentication is handled via a shared API key (not a user JWT token).
    """

    # Only these statuses may be written by camera detection.
    # RESERVED status is owned by the booking flow and must not be overwritten.
    CAMERA_WRITABLE_STATUSES = {SlotStatus.AVAILABLE, SlotStatus.OCCUPIED}

    def __init__(self, db: Session) -> None:
        self.db = db
        self.slot_repo = ParkingSlotRepository(db)

    def process_detection(self, payload: CameraDetectionPayload) -> CameraDetectionResponse:
        """Apply detected slot statuses to the database and return a summary.

        Rules:
        - Only AVAILABLE / OCCUPIED may be written (camera cannot set RESERVED).
        - Slots whose current status is RESERVED are skipped to avoid breaking
          an active booking.
        - If the detected status equals the current status, no DB write is made.
        """
        results: list[SlotUpdateResult] = []
        updated_count = 0

        for detection in payload.slots:
            result = self._process_single_slot(detection)
            results.append(result)
            if result.changed:
                updated_count += 1

        self.db.commit()

        return CameraDetectionResponse(
            camera_id=payload.camera_id,
            total_slots=len(payload.slots),
            updated_count=updated_count,
            unchanged_count=len(payload.slots) - updated_count,
            results=results,
        )

    def _process_single_slot(self, detection: SlotDetectionResult) -> SlotUpdateResult:
        """Handle status update for a single slot. Returns outcome without committing."""
        slot: ParkingSlot | None = self.slot_repo.get(detection.slot_id)

        # Slot not found — record as unchanged
        if slot is None:
            return SlotUpdateResult(
                slot_id=detection.slot_id,
                slot_number="UNKNOWN",
                previous_status="UNKNOWN",
                new_status=detection.detected_status.value,
                changed=False,
            )

        previous_status = slot.status

        # Skip slots currently RESERVED — camera must not overwrite booking state
        if previous_status == SlotStatus.RESERVED.value:
            return SlotUpdateResult(
                slot_id=slot.id,
                slot_number=slot.slot_number,
                previous_status=previous_status,
                new_status=previous_status,  # unchanged
                changed=False,
            )

        # Skip if status is already what the camera detected
        new_status = detection.detected_status.value
        if previous_status == new_status:
            return SlotUpdateResult(
                slot_id=slot.id,
                slot_number=slot.slot_number,
                previous_status=previous_status,
                new_status=new_status,
                changed=False,
            )

        # Apply the update (commit is done in batch by the caller)
        slot.status = new_status
        self.db.add(slot)

        return SlotUpdateResult(
            slot_id=slot.id,
            slot_number=slot.slot_number,
            previous_status=previous_status,
            new_status=new_status,
            changed=True,
        )
