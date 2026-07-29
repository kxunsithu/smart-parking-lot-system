"""Business logic for Parking Lots."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.parking_lot import ParkingLot
from app.models.user import User
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_lot import ParkingLotCreate, ParkingLotUpdate
from app.services.subscription_service import SubscriptionService


class ParkingLotService:
    def __init__(self, db: Session):
        self.db = db
        self.lot_repo = ParkingLotRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)
        self.sub_service = SubscriptionService(db)

    def _resolve_owner_id(self, current_user: User, requested_owner_id: int | None) -> int:
        if current_user.role.name == RoleName.ADMIN.value:
            if not requested_owner_id:
                raise ForbiddenException("owner_id is required when an Admin creates a parking lot.")
            if not self.owner_repo.get(requested_owner_id):
                raise NotFoundException("Owner not found.")
            return requested_owner_id

        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner:
            raise ForbiddenException("Only Parking Owners or Admins can create parking lots.")
        
        return owner.id

    def create_lot(self, payload: ParkingLotCreate, current_user: User) -> ParkingLot:
        owner_id = self._resolve_owner_id(current_user, payload.owner_id)

        # Subscription gate — Admin is exempt
        if current_user.role.name != RoleName.ADMIN.value:
            self.sub_service.check_subscription_required(owner_id)
            max_lots = self.sub_service.get_lot_limit(owner_id)
            current_count = self.db.scalar(
                select(func.count(ParkingLot.id)).where(ParkingLot.owner_id == owner_id)
            ) or 0
            if current_count >= max_lots:
                raise ForbiddenException(
                    f"Your subscription allows a maximum of {max_lots} parking lot(s). "
                    "Please upgrade your package."
                )

        lot = ParkingLot(
            owner_id=owner_id,
            name=payload.name,
            google_map_url=payload.google_map_url,
        )
        return self.lot_repo.create(lot)

    def get_by_id(self, lot_id: int) -> ParkingLot:
        lot = self.db.scalar(
            select(ParkingLot).options(joinedload(ParkingLot.owner)).where(ParkingLot.id == lot_id)
        )
        if not lot:
            raise NotFoundException("Resource not found.")
        return lot

    def _assert_can_manage(self, lot: ParkingLot, current_user: User) -> None:
        if current_user.role.name == RoleName.ADMIN.value:
            return
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner or lot.owner_id != owner.id:
            raise ForbiddenException("You do not have permission to manage this parking lot.")

    def list_lots(self, params: PaginationParams, type_: str | None = None, owner_id: int | None = None, with_staff_count: bool = False):
        stmt = select(ParkingLot).options(joinedload(ParkingLot.owner))
        if type_:
            stmt = stmt.where(ParkingLot.type == type_)
        if owner_id:
            stmt = stmt.where(ParkingLot.owner_id == owner_id)

        items, total = self.lot_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[ParkingLot.name],
        )
        
        # Add staff count if requested
        if with_staff_count:
            from app.models.parking_staff import ParkingStaff
            for lot in items:
                staff_count = self.db.scalar(
                    select(func.count(ParkingStaff.id)).where(ParkingStaff.parking_lot_id == lot.id)
                )
                lot.staff_count = staff_count or 0
        
        return items, build_meta(total, params.page, params.limit)

    def update_lot(self, lot_id: int, payload: ParkingLotUpdate, current_user: User) -> ParkingLot:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            self.sub_service.check_subscription_required(owner.id)
        data = payload.model_dump(exclude_unset=True)
        return self.lot_repo.update(lot, data)

    def delete_lot(self, lot_id: int, current_user: User) -> None:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            self.sub_service.check_subscription_required(owner.id)
        self.lot_repo.delete(lot)

    def toggle_lot_status(self, lot_id: int, current_user: User) -> ParkingLot:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        lot.is_active = not lot.is_active
        return self.lot_repo.update(lot, {"is_active": lot.is_active})
