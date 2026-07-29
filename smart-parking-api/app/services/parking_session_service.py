"""Business logic for Parking Sessions (entry/exit, fee calculation)."""
import math
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.constants import RoleName, SessionStatus, SlotStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.parking_session import ParkingSession
from app.models.user import User
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_session import ParkingSessionFinish, ParkingSessionStart


class ParkingSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = ParkingSessionRepository(db)
        self.slot_repo = ParkingSlotRepository(db)
        self.vehicle_repo = VehicleRepository(db)

    def _assert_staff_permission(self, current_user: User) -> None:
        if current_user.role.name not in (
            RoleName.ADMIN.value,
            RoleName.OWNER.value,
            RoleName.STAFF.value,
        ):
            raise ForbiddenException("Only Staff, Owner, or Admin can manage parking sessions.")

    def start_session(self, payload: ParkingSessionStart, current_user: User) -> ParkingSession:
        self._assert_staff_permission(current_user)

        vehicle = self.vehicle_repo.get(payload.vehicle_id)
        if not vehicle:
            raise NotFoundException("Vehicle not found.")

        slot = self.slot_repo.get(payload.slot_id)
        if not slot:
            raise NotFoundException("Parking slot not found.")
        if slot.status == SlotStatus.OCCUPIED.value:
            raise BadRequestException("Slot is already occupied.")

        session = ParkingSession(
            vehicle_id=payload.vehicle_id,
            slot_id=payload.slot_id,
            start_time=datetime.now(timezone.utc),
            status=SessionStatus.ACTIVE.value,
        )
        session = self.session_repo.create(session)

        slot.status = SlotStatus.OCCUPIED.value
        self.db.commit()
        self.db.refresh(session)

        return session

    def get_by_id(self, session_id: int) -> ParkingSession:
        session = self.session_repo.get(session_id)
        if not session:
            raise NotFoundException("Parking session not found.")
        return session

    def list_sessions(
        self,
        params: PaginationParams,
        status: str | None = None,
        vehicle_id: int | None = None,
    ):
        stmt = select(ParkingSession)
        if status:
            stmt = stmt.where(ParkingSession.status == status)
        if vehicle_id:
            stmt = stmt.where(ParkingSession.vehicle_id == vehicle_id)

        items, total = self.session_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def finish_session(
        self, session_id: int, payload: ParkingSessionFinish, current_user: User
    ) -> ParkingSession:
        self._assert_staff_permission(current_user)

        session = self.get_by_id(session_id)
        if session.status != SessionStatus.ACTIVE.value:
            raise BadRequestException("Only ACTIVE sessions can be finished.")

        exit_time = datetime.now(timezone.utc)
        entry_time = session.start_time
        if entry_time.tzinfo is None:
            entry_time = entry_time.replace(tzinfo=timezone.utc)

        duration_minutes = max(1, math.ceil((exit_time - entry_time).total_seconds() / 60))
        rate_per_hour = payload.rate_per_hour if payload.rate_per_hour else settings.DEFAULT_HOURLY_RATE
        fee = round((duration_minutes / 60) * rate_per_hour, 2)

        session.end_time = exit_time
        session.duration = duration_minutes
        session.fee = fee
        session.status = SessionStatus.FINISHED.value

        slot = self.slot_repo.get(session.slot_id)
        if slot:
            slot.status = SlotStatus.AVAILABLE.value

        self.db.commit()
        self.db.refresh(session)
        return session
