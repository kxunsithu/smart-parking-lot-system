"""Admin-facing user management business logic."""
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleName
from app.core.exceptions import NotFoundException
from app.models.car import Car
from app.models.customer import Customer
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_staff import ParkingStaff
from app.models.pending_payment import PendingWalletPayment
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.user import UserUpdate
from app.services.parking_owner_service import ParkingOwnerService


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def get_by_id(self, user_id: int) -> User:
        user = self.user_repo.get_with_role(user_id)
        if not user:
            raise NotFoundException("Resource not found.")
        return user

    def list_users(
        self,
        params: PaginationParams,
        role_id: int | None = None,
        is_active: bool | None = None,
        is_verified: bool | None = None,
    ):
        stmt = select(User).options(joinedload(User.role))
        if role_id is not None:
            stmt = stmt.where(User.role_id == role_id)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        if is_verified is not None:
            stmt = stmt.where(User.is_verified == is_verified)

        items, total = self.user_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[User.name, User.email],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_user(self, user_id: int, payload: UserUpdate) -> User:
        user = self.get_by_id(user_id)
        data = payload.model_dump(exclude_unset=True)
        return self.user_repo.update(user, data)

    def deactivate_user(self, user_id: int) -> User:
        user = self.get_by_id(user_id)
        user.is_active = False
        self.db.commit()
        self.db.refresh(user)
        return user

    def activate_user(self, user_id: int) -> User:
        user = self.get_by_id(user_id)
        user.is_active = True
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: int) -> None:
        user = self.get_by_id(user_id)

        # parking_staff.created_by references users.id without ON DELETE, so detach
        # any staff records this user created before removing the user row.
        self.db.execute(
            update(ParkingStaff).where(ParkingStaff.created_by == user.id).values(created_by=None)
        )

        # pending_wallet_payments.user_id also references users.id without ON DELETE.
        self.db.execute(delete(PendingWalletPayment).where(PendingWalletPayment.user_id == user.id))

        # Parking owners own an entire tree of data (lots → floors → slots → sessions,
        # staff accounts, wallet account, subscriptions) – handled by the owner service.
        if user.role.name == RoleName.OWNER.value:
            owner = self.db.scalar(select(ParkingOwner).where(ParkingOwner.user_id == user.id))
            if owner:
                ParkingOwnerService(self.db).delete_owner(owner.id)
                return

        # Customers have cars and parked sessions that must be removed before the user row.
        if user.role.name == RoleName.CUSTOMER.value:
            self._delete_customer_sessions(user)

        self.user_repo.delete(user)

    def _delete_customer_sessions(self, user: User) -> None:
        """Remove a customer's parking sessions and cars so their user row can be deleted."""
        customer = self.db.scalar(select(Customer).where(Customer.user_id == user.id))
        if not customer:
            return
        car_ids = select(Car.id).where(Car.customer_id == customer.id)
        # Sessions first – their car_id/slot_id FKs have no ON DELETE action. Any
        # payments/pending references to those sessions are SET NULL by the DB.
        self.db.execute(delete(ParkingSession).where(ParkingSession.car_id.in_(car_ids)))
        self.db.execute(delete(Car).where(Car.customer_id == customer.id))
        self.db.commit()
