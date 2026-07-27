from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.scalar(select(User).where(User.email == email))

    def get_by_email_with_role(self, email: str) -> Optional[User]:
        return self.db.scalar(select(User).options(joinedload(User.role)).where(User.email == email))

    def get_with_role(self, id_: int) -> Optional[User]:
        return self.db.scalar(select(User).options(joinedload(User.role)).where(User.id == id_))
