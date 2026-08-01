"""Business logic for Parking Sessions (entry/exit, fee calculation)."""
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.config.settings import settings
from app.core.constants import RoleName, SessionStatus, SlotStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.car import Car
from app.models.customer import Customer
from app.models.parking_session import ParkingSession
from app.models.user import User
from app.repositories.car_repository import CarRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_floor_repository import ParkingFloorRepository
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_session_repository import ParkingSessionRepository
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_session import ParkingSessionBook, ParkingSessionFinish, ParkingSessionStart


def _session_loading_options():
    """Eager-load car, customer, and user so serialization avoids N+1 queries."""
    return (
        selectinload(ParkingSession.car),
        selectinload(ParkingSession.slot),
        selectinload(ParkingSession.car).selectinload(Car.customer).selectinload(Customer.user),
    )


def serialize_session(session: ParkingSession) -> dict:
    """Build a rich dict with car + customer + slot details for API responses."""
    car = session.car
    customer = car.customer if car else None
    user = customer.user if customer else None
    slot = session.slot

    return {
        "id": session.id,
        "car_id": session.car_id,
        "slot_id": session.slot_id,
        "slot_number": slot.slot_number if slot else None,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "duration": session.duration,
        "fee": session.fee,
        "status": session.status,
        "car": (
            {
                "id": car.id,
                "customer_id": car.customer_id,
                "plate_number": car.plate_number,
                "brand": car.brand,
                "color": car.color,
            }
            if car
            else None
        ),
        "customer": (
            {
                "id": user.id if user else None,
                "name": user.name if user else None,
                "email": user.email if user else None,
                "phone": user.phone if user else None,
            }
            if customer and user
            else None
        ),
    }


def _calculate_fee(start_time: datetime, end_time: datetime, rate_per_hour: float) -> tuple[int, float]:
    """Return (duration_minutes, fee) given start/end times and hourly rate."""
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    duration_minutes = max(1, math.ceil((end_time - start_time).total_seconds() / 60))
    fee = round((duration_minutes / 60) * rate_per_hour, 2)
    return duration_minutes, fee


def _normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _session_window(session: ParkingSession, now: datetime) -> tuple[datetime, datetime]:
    start = _normalize_utc(session.start_time)
    if session.end_time:
        end = _normalize_utc(session.end_time)
    else:
        end = now
    return start, end


def _assert_no_schedule_conflict(
    start: datetime,
    end: datetime,
    existing_sessions: list[ParkingSession],
    now: datetime,
    *,
    buffer: timedelta | None = None,
    conflict_message: str,
) -> None:
    for session in existing_sessions:
        s_start, s_end = _session_window(session, now)

        if buffer is not None:
            has_gap = end <= s_start - buffer or start >= s_end + buffer
        else:
            has_gap = end <= s_start or start >= s_end

        if has_gap:
            continue

        s_start_str = s_start.strftime("%Y-%m-%d %I:%M %p")
        s_end_str = s_end.strftime("%Y-%m-%d %I:%M %p") if session.end_time else "present"
        raise BadRequestException(conflict_message.format(start=s_start_str, end=s_end_str))


class ParkingSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = ParkingSessionRepository(db)
        self.slot_repo = ParkingSlotRepository(db)
        self.car_repo = CarRepository(db)

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

    def book_session(self, payload: ParkingSessionBook, current_user: User) -> ParkingSession:
        """
        Customer books a session with start/end time.
        Creates an ACTIVE session with a calculated fee.
        Slot status does NOT change here.
        """
        # Validate customer
        if current_user.role.name != RoleName.CUSTOMER.value:
            raise ForbiddenException("Only customers can book sessions.")
        customer = self._get_customer(current_user)
        if not customer:
            raise ForbiddenException("Customer profile not found.")

        # Validate car ownership
        car = self.car_repo.get(payload.car_id)
        if not car:
            raise NotFoundException("Car not found.")
        if car.customer_id != customer.id:
            raise ForbiddenException("You can only book sessions for your own cars.")

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

        car_sessions = self.db.scalars(
            select(ParkingSession).where(
                ParkingSession.car_id == payload.car_id,
                ParkingSession.status.in_([SessionStatus.ACTIVE.value, SessionStatus.PENDING.value]),
            )
        ).all()

        _assert_no_schedule_conflict(
            start,
            end,
            car_sessions,
            now,
            conflict_message=(
                "This car already has a session from {start} to {end}. "
                "You cannot book another session during the same time period."
            ),
        )

        # Query existing active/pending sessions for this slot to check buffer conflicts
        slot_sessions = self.db.scalars(
            select(ParkingSession).where(
                ParkingSession.slot_id == payload.slot_id,
                ParkingSession.status.in_([SessionStatus.ACTIVE.value, SessionStatus.PENDING.value])
            )
        ).all()

        _assert_no_schedule_conflict(
            start,
            end,
            slot_sessions,
            now,
            buffer=timedelta(hours=2),
            conflict_message=(
                "Slot conflicts with an existing session ({start} to {end}). "
                "A 2-hour buffer gap is required before and after bookings."
            ),
        )

        # Calculate fee using lot rate
        rate_per_hour = self._get_lot_rate(payload.slot_id)
        duration_minutes, fee = _calculate_fee(start, end, rate_per_hour)

        # Create ACTIVE session directly
        session = ParkingSession(
            car_id=payload.car_id,
            slot_id=payload.slot_id,
            start_time=start,
            end_time=end,
            duration=duration_minutes,
            fee=fee,
            status=SessionStatus.ACTIVE.value,
        )
        session = self.session_repo.create(session)

        self.db.commit()
        self.db.refresh(session)

        # Reload with relationships populated so the API returns full car/customer details
        session = self.get_by_id(session.id)

        return session

    # ─── Staff / Direct Start Flow ────────────────────────────────────────────

    def start_session(self, payload: ParkingSessionStart, current_user: User) -> ParkingSession:
        raise ForbiddenException("Only customers can create parking sessions.")

    # ─── Common ───────────────────────────────────────────────────────────────

    def get_by_id(self, session_id: int) -> ParkingSession:
        stmt = (
            select(ParkingSession)
            .options(*_session_loading_options())
            .where(ParkingSession.id == session_id)
        )
        session = self.db.scalars(stmt).unique().first()
        if not session:
            raise NotFoundException("Parking session not found.")
        return session

    def list_sessions(
        self,
        params: PaginationParams,
        status: str | None = None,
        car_id: int | None = None,
        slot_id: int | None = None,
        plate_number: str | None = None,
        current_user: User | None = None,
    ):
        stmt = select(ParkingSession).options(*_session_loading_options())
        if status:
            stmt = stmt.where(ParkingSession.status == status)
        if car_id:
            stmt = stmt.where(ParkingSession.car_id == car_id)
        if slot_id:
            stmt = stmt.where(ParkingSession.slot_id == slot_id)
        if plate_number:
            stmt = stmt.join(Car, ParkingSession.car_id == Car.id).where(
                func.upper(Car.plate_number) == plate_number.upper()
            )

        # Filter by customer if current user is a customer
        if current_user and current_user.role.name == RoleName.CUSTOMER.value:
            customer = self._get_customer(current_user)
            if customer:
                car_repo = CarRepository(self.db)
                customer_cars = car_repo.list_by_customer(customer.id)
                customer_car_ids = [c.id for c in customer_cars]
                stmt = stmt.where(ParkingSession.car_id.in_(customer_car_ids))

        items, total = self.session_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        serialized = [serialize_session(s) for s in items]
        return serialized, build_meta(total, params.page, params.limit)

    def finish_session(
        self, session_id: int, payload: ParkingSessionFinish, current_user: User
    ) -> ParkingSession:
        session = self.get_by_id(session_id)

        # Allow customers to finish their own sessions
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self._get_customer(current_user)
            car = self.car_repo.get(session.car_id)
            if not customer or not car or car.customer_id != customer.id:
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

        return self.get_by_id(session.id)
