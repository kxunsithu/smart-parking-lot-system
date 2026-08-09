"""Admin-facing user management business logic."""
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.user import UserUpdate


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
        self.user_repo.delete(user)
