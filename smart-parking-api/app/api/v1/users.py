"""Admin-only user management endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import require_roles
from app.dependencies.pagination import pagination_params
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.user import UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(require_roles(RoleName.ADMIN))])


@router.get("", response_model=SuccessResponse[list[UserOut]])
def list_users(
    role_id: int | None = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    items, meta = UserService(db).list_users(params, role_id=role_id)
    return {"success": True, "message": "Users fetched successfully.", "data": items, "meta": meta}


@router.get("/{user_id}", response_model=SuccessResponse[UserOut])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService(db).get_by_id(user_id)
    return {"success": True, "message": "User fetched successfully.", "data": user}


@router.put("/{user_id}", response_model=SuccessResponse[UserOut])
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = UserService(db).update_user(user_id, payload)
    return {"success": True, "message": "User updated successfully.", "data": user}


@router.patch("/{user_id}/activate", response_model=SuccessResponse[UserOut])
def activate_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService(db).activate_user(user_id)
    return {"success": True, "message": "User activated successfully.", "data": user}


@router.patch("/{user_id}/deactivate", response_model=SuccessResponse[UserOut])
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService(db).deactivate_user(user_id)
    return {"success": True, "message": "User deactivated successfully.", "data": user}


@router.delete("/{user_id}", response_model=SuccessResponse[None])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    UserService(db).delete_user(user_id)
    return {"success": True, "message": "User deleted successfully.", "data": None}
