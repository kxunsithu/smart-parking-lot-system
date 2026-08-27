"""Business logic for Parking Slots."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import RoleName, SlotStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.parking_floor import ParkingFloor
from app.models.parking_slot import ParkingSlot
from app.models.user import User
from app.repositories.parking_floor_repository import ParkingFloorRepository
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.parking_slot_repository import ParkingSlotRepository
from app.repositories.parking_staff_repository import ParkingStaffRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_slot import ParkingSlotCreate, ParkingSlotUpdate


class ParkingSlotService:
    def __init__(self, db: Session):
        self.db = db
        self.slot_repo = ParkingSlotRepository(db)
        self.floor_repo = ParkingFloorRepository(db)
        self.lot_repo = ParkingLotRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)
        self.staff_repo = ParkingStaffRepository(db)

    def _assert_floor_ownership(self, floor_id: int, current_user: User) -> None:
        floor = self.floor_repo.get(floor_id)
        if not floor:
            raise NotFoundException("Parking floor not found.")
        if current_user.role.name == RoleName.ADMIN.value:
            return
        owner = self.owner_repo.get_by_user_id(current_user.id)
        lot = self.lot_repo.get(floor.parking_lot_id)
        if not owner or not lot or lot.owner_id != owner.id:
            raise ForbiddenException("You can only manage slots for your own parking lots.")

    def _assert_can_update_status(self, slot: ParkingSlot, current_user: User) -> None:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.OWNER.value):
            if current_user.role.name == RoleName.OWNER.value:
                floor = self.floor_repo.get(slot.floor_id)
                lot = self.lot_repo.get(floor.parking_lot_id) if floor else None
                owner = self.owner_repo.get_by_user_id(current_user.id)
                if not owner or not lot or lot.owner_id != owner.id:
                    raise ForbiddenException("You can only manage slots for your own parking lots.")
            return
        if current_user.role.name == RoleName.STAFF.value:
            staff = self.staff_repo.get_by_user_id(current_user.id)
            floor = self.floor_repo.get(slot.floor_id)
            if not staff or not floor or staff.parking_lot_id != floor.parking_lot_id:
                raise ForbiddenException("You can only manage slots in your assigned parking lot.")
            return
        raise ForbiddenException("You do not have permission to update slot status.")

    def _check_slot_number_unique(self, floor_id: int, slot_number: str, exclude_slot_id: int | None = None) -> None:
        floor = self.floor_repo.get(floor_id)
        if not floor:
            return
        
        existing_slot = self.db.scalar(
            select(ParkingSlot)
            .join(ParkingFloor, ParkingSlot.floor_id == ParkingFloor.id)
            .where(
                ParkingFloor.parking_lot_id == floor.parking_lot_id,
                ParkingSlot.slot_number == slot_number,
            )
        )
        
        if existing_slot and (exclude_slot_id is None or existing_slot.id != exclude_slot_id):
            raise BadRequestException(f"Slot number '{slot_number}' already exists in this parking lot.")

    def create_slot(self, payload: ParkingSlotCreate, current_user: User) -> ParkingSlot:
        self._assert_floor_ownership(payload.floor_id, current_user)
        self._check_slot_number_unique(payload.floor_id, payload.slot_number)
        
        slot = ParkingSlot(
            floor_id=payload.floor_id,
            slot_number=payload.slot_number,
            section=payload.section,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        slot = self.slot_repo.create(slot)
        return slot



    def get_by_id(self, slot_id: int) -> ParkingSlot:
        slot = self.slot_repo.get(slot_id)
        if not slot:
            raise NotFoundException("Resource not found.")
        return slot

    def list_slots(
        self,
        params: PaginationParams,
        floor_id: int | None = None,
        status: str | None = None,
    ):
        stmt = select(ParkingSlot)
        if floor_id:
            stmt = stmt.where(ParkingSlot.floor_id == floor_id)
        if status:
            stmt = stmt.where(ParkingSlot.status == status)

        items, total = self.slot_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[ParkingSlot.slot_number, ParkingSlot.section],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_slot(self, slot_id: int, payload: ParkingSlotUpdate, current_user: User) -> ParkingSlot:
        slot = self.get_by_id(slot_id)
        self._assert_floor_ownership(slot.floor_id, current_user)
        
        if payload.slot_number:
            self._check_slot_number_unique(slot.floor_id, payload.slot_number, exclude_slot_id=slot_id)
        
        data = payload.model_dump(exclude_unset=True)
        return self.slot_repo.update(slot, data)

    def update_status(self, slot_id: int, status: SlotStatus, current_user: User) -> ParkingSlot:
        if status == SlotStatus.RESERVED:
            raise BadRequestException("Cannot manually set slot status to RESERVED.")
        slot = self.get_by_id(slot_id)
        self._assert_can_update_status(slot, current_user)
        slot.status = status.value
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def delete_slot(self, slot_id: int, current_user: User) -> None:
        slot = self.get_by_id(slot_id)
        self._assert_floor_ownership(slot.floor_id, current_user)
        floor_id = slot.floor_id
        self.slot_repo.delete(slot)
