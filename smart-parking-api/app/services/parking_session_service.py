"""Business logic for Parking Sessions (entry/exit, fee calculation)."""
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.constants import PaymentMethod, PaymentStatus, RoleName, SessionStatus, SlotStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.parking_session import ParkingSession
from app.models.payment import Payment
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_floor_repository import ParkingFloorRepository
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_session import ParkingSessionBook, ParkingSessionFinish, ParkingSessionStart


def _calculate_fee(start_time: datetime, end_time: datetime, rate_per_hour: float) -> tuple[int, float]:
    """Return (duration_minutes, fee) given start/end times and hourly rate."""
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    duration_minutes = max(1, math.ceil((end_time - start_time).total_seconds() / 60))
    fee = round((duration_minutes / 60) * rate_per_hour, 2)
    return duration_minutes, fee


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

    def _get_customer(self, current_user: User):
        customer_repo = CustomerRepository(self.db)
        return customer_repo.get_by_user_id(current_user.id)

    def _get_lot_rate(self, slot_id: int) -> float:
        """Resolve the effective hourly rate for a slot (lot rate → system default)."""
        slot = self.slot_repo.get(slot_id)
        if not slot:
            return settings.DEFAULT_HOURLY_RATE
        floor_repo = ParkingFloorRepository(self.db)
        floor = floor_repo.get(slot.floor_id)
        if not floor:
            return settings.DEFAULT_HOURLY_RATE
        lot_repo = ParkingLotRepository(self.db)
        lot = lot_repo.get(floor.parking_lot_id)
        if lot and lot.rate_per_hour:
            return lot.rate_per_hour
        return settings.DEFAULT_HOURLY_RATE

    # ─── Customer Booking Flow ────────────────────────────────────────────────

    def book_session(self, payload: ParkingSessionBook, current_user: User) -> tuple[ParkingSession, Payment]:
        """
        Customer books a session with start/end time.
        Creates a PENDING session + PENDING payment.
        Slot status does NOT change yet — only changes when payment is confirmed.
        """
        # Validate customer
        if current_user.role.name != RoleName.CUSTOMER.value:
            raise ForbiddenException("Only customers can book sessions.")
        customer = self._get_customer(current_user)
        if not customer:
            raise ForbiddenException("Customer profile not found.")

        # Validate vehicle ownership
        vehicle = self.vehicle_repo.get(payload.vehicle_id)
        if not vehicle:
            raise NotFoundException("Vehicle not found.")
        if vehicle.customer_id != customer.id:
            raise ForbiddenException("You can only book sessions for your own vehicles.")

        # Validate slot availability (existence check)
        slot = self.slot_repo.get(payload.slot_id)
        if not slot:
            raise NotFoundException("Parking slot not found.")

        # Validate times (must be in the future, end > start)
        now = datetime.now(timezone.utc)
        start = payload.start_time
        end = payload.end_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if start < now:
            raise BadRequestException("Start time must be in the future.")
        if end <= start:
            raise BadRequestException("End time must be after start time.")

        # Query existing active/pending sessions for this slot to check buffer conflicts
        existing_sessions = self.db.scalars(
            select(ParkingSession).where(
                ParkingSession.slot_id == payload.slot_id,
                ParkingSession.status.in_([SessionStatus.ACTIVE.value, SessionStatus.PENDING.value])
            )
        ).all()

        for s in existing_sessions:
            s_start = s.start_time.replace(tzinfo=timezone.utc) if s.start_time.tzinfo is None else s.start_time
            if s.end_time:
                s_end = s.end_time.replace(tzinfo=timezone.utc) if s.end_time.tzinfo is None else s.end_time
            else:
                s_end = now

            # Overlap with 2-hour buffer gap check
            if not (end <= s_start - timedelta(hours=2) or start >= s_end + timedelta(hours=2)):
                s_start_str = s_start.strftime("%Y-%m-%d %I:%M %p")
                s_end_str = s_end.strftime("%Y-%m-%d %I:%M %p") if s.end_time else "present"
                raise BadRequestException(
                    f"Slot conflicts with an existing session ({s_start_str} to {s_end_str}). "
                    "A 2-hour buffer gap is required before and after bookings."
                )

        # Calculate fee using lot rate
        rate_per_hour = self._get_lot_rate(payload.slot_id)
        duration_minutes, fee = _calculate_fee(start, end, rate_per_hour)

        # Validate payment method
        valid_methods = {m.value for m in PaymentMethod}
        if payload.payment_method.upper() not in valid_methods:
            raise BadRequestException(f"Invalid payment method. Valid options: {', '.join(valid_methods)}")

        # Create ACTIVE session directly
        session = ParkingSession(
            vehicle_id=payload.vehicle_id,
            slot_id=payload.slot_id,
            start_time=start,
            end_time=end,
            duration=duration_minutes,
            fee=fee,
            status=SessionStatus.ACTIVE.value,
        )
        session = self.session_repo.create(session)

        # Create PAID payment directly
        payment = Payment(
            parking_session_id=session.id,
            customer_id=customer.id,
            amount=fee,
            payment_method=payload.payment_method.upper(),
            status=PaymentStatus.PAID.value,
        )
        self.db.add(payment)

        # Occupy the slot immediately only if start time is near (e.g., within 5 minutes or in the past)
        if slot and start <= now + timedelta(minutes=5):
            slot.status = SlotStatus.OCCUPIED.value

        self.db.commit()
        self.db.refresh(session)
        self.db.refresh(payment)

        return session, payment



    # ─── Staff / Direct Start Flow ────────────────────────────────────────────

    def start_session(self, payload: ParkingSessionStart, current_user: User) -> ParkingSession:
        vehicle = self.vehicle_repo.get(payload.vehicle_id)
        if not vehicle:
            raise NotFoundException("Vehicle not found.")

        # Allow customers to start sessions for their own vehicles
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self._get_customer(current_user)
            if not customer or vehicle.customer_id != customer.id:
                raise ForbiddenException("You can only start sessions for your own vehicles.")
        else:
            self._assert_staff_permission(current_user)

        slot = self.slot_repo.get(payload.slot_id)
        if not slot:
            raise NotFoundException("Parking slot not found.")
        if slot.status == SlotStatus.OCCUPIED.value:
            raise BadRequestException("Slot is already occupied.")

        # Check if starting this session now conflicts with any future bookings (starts within 2 hours)
        now = datetime.now(timezone.utc)
        existing_sessions = self.db.scalars(
            select(ParkingSession).where(
                ParkingSession.slot_id == payload.slot_id,
                ParkingSession.status.in_([SessionStatus.ACTIVE.value, SessionStatus.PENDING.value])
            )
        ).all()
        for s in existing_sessions:
            s_start = s.start_time.replace(tzinfo=timezone.utc) if s.start_time.tzinfo is None else s.start_time
            if s_start > now:
                if s_start < now + timedelta(hours=2):
                    s_start_str = s_start.strftime("%Y-%m-%d %I:%M %p")
                    raise BadRequestException(
                        f"Cannot start session now. A booking starts soon at {s_start_str} "
                        "(requires a 2-hour buffer gap before booking starts)."
                    )

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

    # ─── Common ───────────────────────────────────────────────────────────────

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
        slot_id: int | None = None,
        current_user: User | None = None,
    ):
        stmt = select(ParkingSession)
        if status:
            stmt = stmt.where(ParkingSession.status == status)
        if vehicle_id:
            stmt = stmt.where(ParkingSession.vehicle_id == vehicle_id)
        if slot_id:
            stmt = stmt.where(ParkingSession.slot_id == slot_id)

        # Filter by customer if current user is a customer
        if current_user and current_user.role.name == RoleName.CUSTOMER.value:
            customer = self._get_customer(current_user)
            if customer:
                vehicle_repo = VehicleRepository(self.db)
                customer_vehicles = vehicle_repo.list_by_customer(customer.id)
                customer_vehicle_ids = [v.id for v in customer_vehicles]
                stmt = stmt.where(ParkingSession.vehicle_id.in_(customer_vehicle_ids))

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
        session = self.get_by_id(session_id)

        # Allow customers to finish their own sessions
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self._get_customer(current_user)
            vehicle = self.vehicle_repo.get(session.vehicle_id)
            if not customer or not vehicle or vehicle.customer_id != customer.id:
                raise ForbiddenException("You can only finish your own parking sessions.")
        else:
            self._assert_staff_permission(current_user)

        if session.status != SessionStatus.ACTIVE.value:
            raise BadRequestException("Only ACTIVE sessions can be finished.")

        exit_time = datetime.now(timezone.utc)
        entry_time = session.start_time
        if entry_time.tzinfo is None:
            entry_time = entry_time.replace(tzinfo=timezone.utc)

        duration_minutes = max(1, math.ceil((exit_time - entry_time).total_seconds() / 60))
        rate_per_hour = payload.rate_per_hour or self._get_lot_rate(session.slot_id)
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
