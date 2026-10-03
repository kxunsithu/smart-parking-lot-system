from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.parking_floor import ParkingFloor
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.payment import Payment
from app.models.pending_payment import PendingWalletPayment
from app.models.user import User
from app.repositories.parking_floor_repository import ParkingFloorRepository
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_floor import ParkingFloorCreate, ParkingFloorUpdate


class ParkingFloorService:
    def __init__(self, db: Session):
        self.db = db
        self.floor_repo = ParkingFloorRepository(db)
        self.lot_repo = ParkingLotRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)

    def _assert_lot_ownership(self, lot_id: int, current_user: User) -> None:
        lot = self.lot_repo.get(lot_id)
        if not lot:
            raise NotFoundException("Parking lot not found.")
        if current_user.role.name == RoleName.ADMIN.value:
            return
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner or lot.owner_id != owner.id:
            raise ForbiddenException("You can only manage floors for your own parking lots.")

    def create_floor(self, payload: ParkingFloorCreate, current_user: User) -> ParkingFloor:
        self._assert_lot_ownership(payload.parking_lot_id, current_user)
        floor = ParkingFloor(parking_lot_id=payload.parking_lot_id, floor_name=payload.floor_name)
        return self.floor_repo.create(floor)

    def get_by_id(self, floor_id: int) -> ParkingFloor:
        floor = self.floor_repo.get(floor_id)
        if not floor:
            raise NotFoundException("Resource not found.")
        return floor

    def list_floors(self, params: PaginationParams, parking_lot_id: int | None = None):
        stmt = select(ParkingFloor)
        if parking_lot_id:
            stmt = stmt.where(ParkingFloor.parking_lot_id == parking_lot_id)

        items, total = self.floor_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def update_floor(self, floor_id: int, payload: ParkingFloorUpdate, current_user: User) -> ParkingFloor:
        floor = self.get_by_id(floor_id)
        self._assert_lot_ownership(floor.parking_lot_id, current_user)
        data = payload.model_dump(exclude_unset=True)
        return self.floor_repo.update(floor, data)

    def delete_floor(self, floor_id: int, current_user: User) -> None:
        floor = self.get_by_id(floor_id)
        self._assert_lot_ownership(floor.parking_lot_id, current_user)
        
        slot_ids = list(self.db.scalars(select(ParkingSlot.id).where(ParkingSlot.floor_id == floor_id)).all())
        if slot_ids:
            session_ids = list(self.db.scalars(select(ParkingSession.id).where(ParkingSession.slot_id.in_(slot_ids))).all())
            if session_ids:
                self.db.execute(delete(PendingWalletPayment).where(PendingWalletPayment.session_id.in_(session_ids)))
                self.db.execute(delete(Payment).where(Payment.session_id.in_(session_ids)))
                self.db.execute(delete(ParkingSession).where(ParkingSession.id.in_(session_ids)))
            self.db.execute(delete(PendingWalletPayment).where(PendingWalletPayment.pending_slot_id.in_(slot_ids)))
            self.db.execute(delete(ParkingSlot).where(ParkingSlot.id.in_(slot_ids)))

        self.floor_repo.delete(floor)
