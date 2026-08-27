"""Business logic for managing Parking Owners."""
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.models.pending_payment import PendingWalletPayment
from app.models.user import User
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_owner import ParkingOwnerUpdate


class ParkingOwnerService:
    def __init__(self, db: Session):
        self.db = db
        self.owner_repo = ParkingOwnerRepository(db)
        self.user_repo = UserRepository(db)

    def get_by_id(self, owner_id: int) -> ParkingOwner:
        owner = self.db.scalar(
            select(ParkingOwner).options(joinedload(ParkingOwner.user)).where(ParkingOwner.id == owner_id)
        )
        if not owner:
            raise NotFoundException("Resource not found.")
        return owner

    def get_by_user_id(self, user_id: int) -> ParkingOwner:
        owner = self.owner_repo.get_by_user_id(user_id)
        if not owner:
            raise NotFoundException("Owner profile not found for the current user.")
        return owner

    def list_owners(
        self,
        params: PaginationParams,
        is_active: bool | None = None,
        is_verified: bool | None = None,
    ):
        stmt = select(ParkingOwner).options(joinedload(ParkingOwner.user))
        if is_active is not None:
            stmt = stmt.where(ParkingOwner.user.has(User.is_active == is_active))
        if is_verified is not None:
            stmt = stmt.where(ParkingOwner.user.has(User.is_verified == is_verified))
        items, total = self.owner_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[ParkingOwner.company_name],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_owner(self, owner_id: int, payload: ParkingOwnerUpdate) -> ParkingOwner:
        owner = self.get_by_id(owner_id)
        data = payload.model_dump(exclude_unset=True)
        return self.owner_repo.update(owner, data)

    def delete_owner(self, owner_id: int) -> None:
        owner = self.get_by_id(owner_id)

        # Drop in-flight wallet payments initiated by this owner's user
        # (pending_wallet_payments.user_id has no ON DELETE action).
        self.db.execute(delete(PendingWalletPayment).where(PendingWalletPayment.user_id == owner.user_id))

        # Build subqueries for the dependency chain under this owner's parking lots
        lot_ids = select(ParkingLot.id).where(ParkingLot.owner_id == owner_id)
        floor_ids = select(ParkingFloor.id).where(ParkingFloor.parking_lot_id.in_(lot_ids))
        slot_ids = select(ParkingSlot.id).where(ParkingSlot.floor_id.in_(floor_ids))
        # Materialise now – the staff rows are deleted below, so a later subquery
        # would resolve to nothing.
        staff_user_ids = list(
            self.db.scalars(
                select(ParkingStaff.user_id).where(ParkingStaff.parking_lot_id.in_(lot_ids))
            ).all()
        )

        # Delete parking sessions (reference parking_slots)
        self.db.execute(delete(ParkingSession).where(ParkingSession.slot_id.in_(slot_ids)))

        # Delete parking slots (reference parking_floors)
        self.db.execute(delete(ParkingSlot).where(ParkingSlot.floor_id.in_(floor_ids)))

        # Delete parking floors (reference parking_lots)
        self.db.execute(delete(ParkingFloor).where(ParkingFloor.parking_lot_id.in_(lot_ids)))

        # Delete parking staff (reference parking_lots) together with their users
        self.db.execute(delete(ParkingStaff).where(ParkingStaff.parking_lot_id.in_(lot_ids)))
        if staff_user_ids:
            self.db.execute(delete(User).where(User.id.in_(staff_user_ids)))

        # Delete parking lots (reference parking_owners)
        self.db.execute(delete(ParkingLot).where(ParkingLot.owner_id == owner_id))

        # Delete the owner profile directly
        self.db.execute(delete(ParkingOwner).where(ParkingOwner.id == owner_id))

        self.db.commit()

        # Then delete the user
        self.user_repo.delete(owner.user)

    def toggle_owner_status(self, owner_id: int) -> ParkingOwner:
        owner = self.get_by_id(owner_id)
        owner.user.is_active = not owner.user.is_active
        self.db.commit()
        self.db.refresh(owner)
        self.db.refresh(owner.user)
        return owner
