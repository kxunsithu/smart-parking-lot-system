from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.models.payment import Payment
from app.models.pending_payment import PendingWalletPayment
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
            city=payload.city,
            rate_per_hour=payload.rate_per_hour,
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

    def list_lots(
        self,
        params: PaginationParams,
        type_: str | None = None,
        owner_id: int | None = None,
        city: str | None = None,
        is_active: bool | None = None,
        only_active_subscription: bool = False,
        with_staff_count: bool = False,
    ):
        stmt = select(ParkingLot).options(joinedload(ParkingLot.owner))
        if type_:
            stmt = stmt.where(ParkingLot.type == type_)
        if owner_id:
            stmt = stmt.where(ParkingLot.owner_id == owner_id)
        if city:
            stmt = stmt.where(ParkingLot.city == city)
        if is_active is not None:
            stmt = stmt.where(ParkingLot.is_active == is_active)
        if only_active_subscription:
            from datetime import datetime, timezone
            from app.core.constants import SubscriptionStatus
            from app.models.owner_subscription import OwnerSubscription

            now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
            active_owner_ids = select(OwnerSubscription.owner_id).where(
                OwnerSubscription.status == SubscriptionStatus.ACTIVE.value,
                OwnerSubscription.expires_at > now_naive,
            )
            stmt = stmt.where(ParkingLot.owner_id.in_(active_owner_ids))

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
            # Perform a single query to get staff counts for all lots in the current page
            staff_counts_query = (
                select(ParkingStaff.parking_lot_id, func.count(ParkingStaff.id).label("staff_count"))
                .where(ParkingStaff.parking_lot_id.in_([lot.id for lot in items]))
                .group_by(ParkingStaff.parking_lot_id)
            )
            staff_counts_result = self.db.execute(staff_counts_query).fetchall()
            staff_counts_map = {row.parking_lot_id: row.staff_count for row in staff_counts_result}

            for lot in items:
                lot.staff_count = staff_counts_map.get(lot.id, 0)
        
        return items, build_meta(total, params.page, params.limit)

    def update_lot(self, lot_id: int, payload: ParkingLotUpdate, current_user: User) -> ParkingLot:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            if owner:
                self.sub_service.check_subscription_required(owner.id)
        data = payload.model_dump(exclude_unset=True)
        return self.lot_repo.update(lot, data)

    def delete_lot(self, lot_id: int, current_user: User) -> None:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            if owner:
                self.sub_service.check_subscription_required(owner.id)

        # 1. Collect child IDs under this lot
        floor_ids = list(self.db.scalars(select(ParkingFloor.id).where(ParkingFloor.parking_lot_id == lot_id)).all())
        slot_ids = list(self.db.scalars(select(ParkingSlot.id).where(ParkingSlot.floor_id.in_(floor_ids))).all()) if floor_ids else []
        session_ids = list(self.db.scalars(select(ParkingSession.id).where(ParkingSession.slot_id.in_(slot_ids))).all()) if slot_ids else []
        staff_user_ids = list(self.db.scalars(select(ParkingStaff.user_id).where(ParkingStaff.parking_lot_id == lot_id)).all())

        # 2. Delete pending wallet payments referencing sessions or slots
        if session_ids or slot_ids:
            conds = []
            if session_ids:
                conds.append(PendingWalletPayment.session_id.in_(session_ids))
            if slot_ids:
                conds.append(PendingWalletPayment.pending_slot_id.in_(slot_ids))
            self.db.execute(delete(PendingWalletPayment).where(or_(*conds)))

        # 3. Delete payments & sessions
        if session_ids:
            self.db.execute(delete(Payment).where(Payment.session_id.in_(session_ids)))
            self.db.execute(delete(ParkingSession).where(ParkingSession.id.in_(session_ids)))

        # 4. Delete slots & floors
        if slot_ids:
            self.db.execute(delete(ParkingSlot).where(ParkingSlot.id.in_(slot_ids)))
        if floor_ids:
            self.db.execute(delete(ParkingFloor).where(ParkingFloor.id.in_(floor_ids)))

        # 5. Delete staff & staff user accounts
        self.db.execute(delete(ParkingStaff).where(ParkingStaff.parking_lot_id == lot_id))
        if staff_user_ids:
            self.db.execute(delete(PendingWalletPayment).where(PendingWalletPayment.user_id.in_(staff_user_ids)))
            self.db.execute(delete(Payment).where(Payment.user_id.in_(staff_user_ids)))
            self.db.execute(delete(User).where(User.id.in_(staff_user_ids)))

        # 6. Delete lot
        self.lot_repo.delete(lot)

    def toggle_lot_status(self, lot_id: int, current_user: User) -> ParkingLot:
        lot = self.get_by_id(lot_id)
        self._assert_can_manage(lot, current_user)
        lot.is_active = not lot.is_active
        return self.lot_repo.update(lot, {"is_active": lot.is_active})