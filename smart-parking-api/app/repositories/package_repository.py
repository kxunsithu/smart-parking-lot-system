"""Repository for Package model."""
from sqlalchemy import select

from app.models.package import Package
from app.repositories.base import BaseRepository


class PackageRepository(BaseRepository[Package]):
    model = Package

    def get_active_packages(self) -> list[Package]:
        return list(self.db.scalars(select(Package).where(Package.is_active == True)).all())
