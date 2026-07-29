"""Business logic for Parking Staff (created by Owner or Admin)."""
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.security import hash_password
from app.models.parking_staff import ParkingStaff
from app.models.user import User
from app.repositories.parking_lot_repository import ParkingLotRepository
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.parking_staff_repository import ParkingStaffRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_staff import ParkingStaffCreate, ParkingStaffUpdate
from app.services.subscription_service import SubscriptionService


class ParkingStaffService:
    def __init__(self, db: Session):
        self.db = db
        self.staff_repo = ParkingStaffRepository(db)
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.lot_repo = ParkingLotRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)
        self.sub_service = SubscriptionService(db)

    def _assert_lot_ownership(self, lot_id: int, current_user: User) -> None:
        lot = self.lot_repo.get(lot_id)
        if not lot:
            raise NotFoundException("Parking lot not found.")
        if current_user.role.name == RoleName.ADMIN.value:
            return
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner or lot.owner_id != owner.id:
            raise ForbiddenException("You can only manage staff for your own parking lots.")

    def create_staff(self, payload: ParkingStaffCreate, current_user: User) -> ParkingStaff:
        self._assert_lot_ownership(payload.parking_lot_id, current_user)

        # Subscription gate
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            self.sub_service.check_subscription_required(owner.id)

        if self.user_repo.get_by_email(payload.email):
            raise ConflictException(
                "Validation failed.",
                errors=[{"field": "email", "message": "Email already exists."}],
            )

        role = self.role_repo.get_by_name(RoleName.STAFF.value)
        if not role:
            raise NotFoundException("Staff role is not configured. Please run the seed script.")

        user = User(
            name=payload.name,
            email=payload.email,
            password=hash_password(payload.password),
            role_id=role.id,
            created_by=current_user.id,
        )
        user = self.user_repo.create(user)

        staff = ParkingStaff(
            user_id=user.id,
            parking_lot_id=payload.parking_lot_id,
        )
        return self.staff_repo.create(staff)

    def get_by_id(self, staff_id: int) -> ParkingStaff:
        staff = self.db.scalar(
            select(ParkingStaff).options(joinedload(ParkingStaff.user)).where(ParkingStaff.id == staff_id)
        )
        if not staff:
            raise NotFoundException("Resource not found.")
        return staff

    def list_staff(self, params: PaginationParams, parking_lot_id: int | None = None):
        stmt = select(ParkingStaff).options(joinedload(ParkingStaff.user))
        if parking_lot_id:
            stmt = stmt.where(ParkingStaff.parking_lot_id == parking_lot_id)

        items, total = self.staff_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
        )
        return items, build_meta(total, params.page, params.limit)

    def update_staff(self, staff_id: int, payload: ParkingStaffUpdate, current_user: User) -> ParkingStaff:
        staff = self.get_by_id(staff_id)
        self._assert_lot_ownership(staff.parking_lot_id, current_user)
        if payload.parking_lot_id:
            self._assert_lot_ownership(payload.parking_lot_id, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            self.sub_service.check_subscription_required(owner.id)
        data = payload.model_dump(exclude_unset=True)
        return self.staff_repo.update(staff, data)

    def delete_staff(self, staff_id: int, current_user: User) -> None:
        staff = self.get_by_id(staff_id)
        self._assert_lot_ownership(staff.parking_lot_id, current_user)
        if current_user.role.name != RoleName.ADMIN.value:
            owner = self.owner_repo.get_by_user_id(current_user.id)
            self.sub_service.check_subscription_required(owner.id)
        self.staff_repo.delete(staff)
