"""Business logic for Parking Lots."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.parking_lot import ParkingLot
from app.models.user import User
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_lot import ParkingLotCreate, ParkingLotUpdate


class ParkingLotService:
    def __init__(self, db: Session):
        self.db = db
        self.lot_repo = ParkingLotRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)
        self.subscription_repo = SubscriptionRepository(db)

    def _check_subscription(self, owner_id: int, current_user: User) -> None:
        """Check if owner has active subscription (skip for admins)."""
        if current_user.role.name == RoleName.ADMIN.value:
            return
        
        subscription = self.subscription_repo.get_active_subscription(owner_id)
        if not subscription:
            raise ForbiddenException("You need an active subscription to manage parking lots.")

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
        
        # Check subscription for owners
        self._check_subscription(owner.id, current_user)
        
        return owner.id

    def create_lot(self, payload: ParkingLotCreate, current_user: User) -> ParkingLot:
        owner_id = self._resolve_owner_id(current_user, payload.owner_id)
        lot = ParkingLot(
            owner_id=owner_id,
            name=payload.name,
            type=payload.type,
            address=payload.address,
            latitude=payload.latitude,
            longitude=payload.longitude,
            google_map_url=payload.google_map_url,
        )
        return self.lot_repo.create(lot)

    def get_by_id(self, lot_id: int) -> ParkingLot:
        lot = self.lot_repo.get(lot_id)
        if not lot:
            raise NotFoundException("Resource not found.")
        return lot

    def _assert_can_manage(self, lot: ParkingLot, current_user: User) -> None:
        if current_user.role.name == RoleName.ADMIN.value:
            return
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner or lot.owner_id != owner.id:
            raise ForbiddenException("You do not have permission to manage this parking lot.")
        
        # Check subscription for owners
        self._check_subscription(owner.id, current_user)

    def list_lots(self, params: PaginationParams, type_: str | None = None, owner_id: int | None = None, for_customers: bool = False):
        stmt = select(ParkingLot)
        if type_:
            stmt = stmt.where(ParkingLot.type == type_)
        if owner_id:
            stmt = stmt.where(ParkingLot.owner_id == owner_id)
        
        # Filter out lots from owners without active subscription when listing for customers
        if for_customers:
            from app.models.subscription import Subscription
            stmt = stmt.join(Subscription, ParkingLot.owner_id == Subscription.parking_owner_id).where(
                Subscription.status == "active"
            )

        items, total = self.lot_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[ParkingLot.name, ParkingLot.address],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_lot(self, lot_id: int, payload: ParkingLotUpdate, current_user: User) -> ParkingLot:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        data = payload.model_dump(exclude_unset=True)
        return self.lot_repo.update(lot, data)

    def delete_lot(self, lot_id: int, current_user: User) -> None:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        self.lot_repo.delete(lot)
