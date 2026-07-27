from typing import Optional

from sqlalchemy import select

from app.models.role import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    model = Role

    def get_by_name(self, name: str) -> Optional[Role]:
        return self.db.scalar(select(Role).where(Role.name == name))
