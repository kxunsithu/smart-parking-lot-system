"""Package endpoints: Admin manages packages available for purchase."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.package import PackageCreate, PackageOut, PackageUpdate
from app.services.package_service import PackageService

router = APIRouter(prefix="/packages", tags=["Packages"])


@router.post("", response_model=SuccessResponse[PackageOut], status_code=status.HTTP_201_CREATED)
def create_package(
    payload: PackageCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    pkg = PackageService(db).create_package(payload)
    return {"success": True, "message": "Package created successfully.", "data": pkg}


@router.get("", response_model=SuccessResponse[list[PackageOut]])
def list_packages(
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER)),
):
    # Owner sees only active packages; Admin sees all
    active_only = current_user.role.name == RoleName.OWNER.value
    items, meta = PackageService(db).list_packages(params, active_only=active_only)
    return {"success": True, "message": "Packages fetched successfully.", "data": items, "meta": meta}


@router.get("/{package_id}", response_model=SuccessResponse[PackageOut])
def get_package(
    package_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER)),
):
    pkg = PackageService(db).get_by_id(package_id)
    return {"success": True, "message": "Package fetched successfully.", "data": pkg}


@router.put("/{package_id}", response_model=SuccessResponse[PackageOut])
def update_package(
    package_id: int,
    payload: PackageUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    pkg = PackageService(db).update_package(package_id, payload)
    return {"success": True, "message": "Package updated successfully.", "data": pkg}


@router.delete("/{package_id}/delete", response_model=SuccessResponse[None])
def delete_package(
    package_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    PackageService(db).hard_delete_package(package_id)
    return {"success": True, "message": "Package deleted successfully.", "data": None}


@router.delete("/{package_id}", response_model=SuccessResponse[None])
def disable_package(
    package_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    PackageService(db).delete_package(package_id)
    return {"success": True, "message": "Package disabled successfully.", "data": None}


@router.patch("/{package_id}/enable", response_model=SuccessResponse[PackageOut])
def enable_package(
    package_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    pkg = PackageService(db).enable_package(package_id)
    return {"success": True, "message": "Package enabled successfully.", "data": pkg}
