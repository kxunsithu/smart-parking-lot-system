"""Business logic for Reservations."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import ReservationStatus, RoleName, SlotStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.reservation import Reservation
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.repositories.parking_staff_repository import ParkingStaffRepository
from app.repositories.reservation_repository import ReservationRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.reservation import ReservationCreate, ReservationUpdate


class ReservationService:
    def __init__(self, db: Session):
        self.db = db
        self.reservation_repo = ReservationRepository(db)
        self.slot_repo = ParkingSlotRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.staff_repo = ParkingStaffRepository(db)

    def _resolve_customer_id(self, current_user: User, requested_customer_id: int | None) -> int:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value):
            if not requested_customer_id:
                raise ForbiddenException("customer_id is required for Admin/Staff.")
            if not self.customer_repo.get(requested_customer_id):
                raise NotFoundException("Customer not found.")
            return requested_customer_id

        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer:
            raise ForbiddenException("Only Customers can create reservations for themselves.")
        return customer.id

    def create_reservation(self, payload: ReservationCreate, current_user: User) -> Reservation:
        slot = self.slot_repo.get(payload.slot_id)
        if not slot:
            raise NotFoundException("Parking slot not found.")
        if slot.status != SlotStatus.AVAILABLE.value:
            raise BadRequestException("Only AVAILABLE slots can be reserved.")

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)

        reservation = Reservation(
            customer_id=customer_id,
            slot_id=payload.slot_id,
            reservation_time=payload.reservation_time,
            status=ReservationStatus.PENDING.value,
        )
        reservation = self.reservation_repo.create(reservation)

        slot.status = SlotStatus.RESERVED.value
        self.db.commit()

        return reservation

    def get_by_id(self, reservation_id: int) -> Reservation:
        reservation = self.reservation_repo.get(reservation_id)
        if not reservation:
            raise NotFoundException("Resource not found.")
        return reservation

    def _assert_can_manage(self, reservation: Reservation, current_user: User) -> None:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.OWNER.value, RoleName.STAFF.value):
            return
        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer or reservation.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to manage this reservation.")

    def get_owned_reservation(self, reservation_id: int, current_user: User) -> Reservation:
        """Fetch a reservation and assert the current user is allowed to view/manage it."""
        reservation = self.get_by_id(reservation_id)
        self._assert_can_manage(reservation, current_user)
        return reservation

    def list_reservations(
        self,
        params: PaginationParams,
        current_user: User,
        status: str | None = None,
        customer_id: int | None = None,
    ):
        stmt = select(Reservation)
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            stmt = stmt.where(Reservation.customer_id == customer.id if customer else -1)
        elif customer_id:
            stmt = stmt.where(Reservation.customer_id == customer_id)
        if status:
            stmt = stmt.where(Reservation.status == status)

        items, total = self.reservation_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def update_reservation(
        self, reservation_id: int, payload: ReservationUpdate, current_user: User
    ) -> Reservation:
        reservation = self.get_by_id(reservation_id)
        self._assert_can_manage(reservation, current_user)
        if reservation.status not in (ReservationStatus.PENDING.value, ReservationStatus.CONFIRMED.value):
            raise BadRequestException("Only PENDING or CONFIRMED reservations can be updated.")
        data = payload.model_dump(exclude_unset=True)
        return self.reservation_repo.update(reservation, data)

    def update_status(
        self, reservation_id: int, status: ReservationStatus, current_user: User
    ) -> Reservation:
        reservation = self.get_by_id(reservation_id)
        self._assert_can_manage(reservation, current_user)

        if reservation.status in (ReservationStatus.CANCELLED.value, ReservationStatus.COMPLETED.value):
            raise BadRequestException(f"Reservation is already {reservation.status.lower()}.")

        slot = self.slot_repo.get(reservation.slot_id)

        if status == ReservationStatus.CANCELLED:
            if slot and slot.status == SlotStatus.RESERVED.value:
                slot.status = SlotStatus.AVAILABLE.value
        elif status == ReservationStatus.CONFIRMED:
            if current_user.role.name == RoleName.CUSTOMER.value:
                raise ForbiddenException("Only Staff, Owner, or Admin can confirm reservations.")
        elif status == ReservationStatus.COMPLETED:
            if current_user.role.name == RoleName.CUSTOMER.value:
                raise ForbiddenException("Only Staff, Owner, or Admin can complete reservations.")

        reservation.status = status.value
        self.db.commit()
        self.db.refresh(reservation)
        return reservation
