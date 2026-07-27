"""Authentication & role-based access control dependencies."""
from typing import Iterable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.database.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise UnauthorizedException("Not authenticated.")

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise UnauthorizedException("Invalid or expired token.") from exc

    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type.")

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Invalid token payload.")

    user = UserRepository(db).get_with_role(int(user_id))
    if not user:
        raise UnauthorizedException("User not found.")
    if not user.is_active:
        raise ForbiddenException("User account is inactive.")

    return user


def require_roles(*roles: RoleName):
    """Dependency factory restricting an endpoint to the given roles."""

    allowed = {role.value for role in roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed:
            raise ForbiddenException("You do not have permission to perform this action.")
        return current_user

    return dependency


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
