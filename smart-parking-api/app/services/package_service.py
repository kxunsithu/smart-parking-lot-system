"""Business logic for Package management (Admin only)."""
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.owner_subscription import OwnerSubscription
from app.models.package import Package
from app.repositories.package_repository import PackageRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.package import PackageCreate, PackageUpdate


class PackageService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PackageRepository(db)

    def create_package(self, payload: PackageCreate) -> Package:
        pkg = Package(**payload.model_dump())
        return self.repo.create(pkg)

    def get_by_id(self, package_id: int) -> Package:
        pkg = self.repo.get(package_id)
        if not pkg:
            raise NotFoundException("Package not found.")
        return pkg

    def list_packages(self, params: PaginationParams, active_only: bool = False):
        stmt = select(Package)
        if active_only:
            stmt = stmt.where(Package.is_active == True)
        items, total = self.repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[Package.name],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_package(self, package_id: int, payload: PackageUpdate) -> Package:
        pkg = self.get_by_id(package_id)
        data = payload.model_dump(exclude_unset=True)
        return self.repo.update(pkg, data)

    def delete_package(self, package_id: int) -> None:
        pkg = self.get_by_id(package_id)
        # Soft-disable instead of hard delete (preserve history)
        self.repo.update(pkg, {"is_active": False})

    def enable_package(self, package_id: int) -> Package:
        pkg = self.get_by_id(package_id)
        return self.repo.update(pkg, {"is_active": True})

    def hard_delete_package(self, package_id: int) -> None:
        pkg = self.get_by_id(package_id)
        
        # Delete related subscriptions first
        self.db.execute(delete(OwnerSubscription).where(OwnerSubscription.package_id == package_id))
        
        # Then delete the package
        self.repo.delete(pkg)
