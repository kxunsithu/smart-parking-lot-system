"""Business logic for managing Parking Owners (created by Admin)."""
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import hash_password
from app.models.parking_owner import ParkingOwner
from app.models.user import User
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.parking_owner import ParkingOwnerCreate, ParkingOwnerUpdate


class ParkingOwnerService:
    def __init__(self, db: Session):
        self.db = db
        self.owner_repo = ParkingOwnerRepository(db)
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    def create_owner(self, payload: ParkingOwnerCreate, created_by: int) -> ParkingOwner:
        if self.user_repo.get_by_email(payload.email):
            raise ConflictException(
                "Validation failed.",
                errors=[{"field": "email", "message": "Email already exists."}],
            )

        role = self.role_repo.get_by_name(RoleName.OWNER.value)
        if not role:
            raise NotFoundException("Owner role is not configured. Please run the seed script.")

        user = User(
            name=payload.name,
            email=payload.email,
            password=hash_password(payload.password),
            phone=payload.phone,
            role_id=role.id,
            created_by=created_by,
        )
        user = self.user_repo.create(user)

        owner = ParkingOwner(
            user_id=user.id,
            company_name=payload.company_name,
            business_license=payload.business_license,
            address=payload.address,
        )
        return self.owner_repo.create(owner)

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

    def list_owners(self, params: PaginationParams):
        stmt = select(ParkingOwner).options(joinedload(ParkingOwner.user))
        items, total = self.owner_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[ParkingOwner.company_name, ParkingOwner.address],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_owner(self, owner_id: int, payload: ParkingOwnerUpdate) -> ParkingOwner:
        owner = self.get_by_id(owner_id)
        data = payload.model_dump(exclude_unset=True)
        return self.owner_repo.update(owner, data)

    def delete_owner(self, owner_id: int) -> None:
        owner = self.get_by_id(owner_id)
        self.owner_repo.delete(owner)
