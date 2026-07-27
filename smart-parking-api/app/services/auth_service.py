"""Business logic for authentication: register, login, refresh, logout, password."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.customer import Customer
from app.models.user import User
from app.repositories.customer_repository import CustomerRepository
from app.repositories.otp_repository import OTPRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.token_blacklist_repository import TokenBlacklistRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest
from app.schemas.user import UserUpdate


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.otp_repo = OTPRepository(db)
        self.blacklist_repo = TokenBlacklistRepository(db)

    def register_customer(self, payload: RegisterRequest) -> User:
        if self.user_repo.get_by_email(payload.email):
            raise ConflictException(
                "Validation failed.",
                errors=[{"field": "email", "message": "Email already exists."}],
            )

        role = self.role_repo.get_by_name(RoleName.CUSTOMER.value)
        if not role:
            raise NotFoundException("Customer role is not configured. Please run the seed script.")

        # Confirm that the email was verified via OTP before allowing registration.
        otp = self.otp_repo.get_by_email(payload.email)
        is_verified = bool(otp and otp.is_used)

        user = User(
            name=payload.name,
            email=payload.email,
            password=hash_password(payload.password),
            phone=payload.phone,
            role_id=role.id,
            created_by=None,
            is_verified=is_verified,
        )
        user = self.user_repo.create(user)

        customer = Customer(user_id=user.id)
        self.customer_repo.create(customer)

        # Clean up the used OTP record now that the user has been created.
        if otp:
            self.otp_repo.delete_by_email(payload.email)

        return self.user_repo.get_with_role(user.id)

    def authenticate(self, payload: LoginRequest) -> tuple[str, str]:
        user = self.user_repo.get_by_email_with_role(payload.email)
        if not user or not verify_password(payload.password, user.password):
            raise UnauthorizedException("Invalid email or password.")
        if not user.is_active:
            raise UnauthorizedException("User account is inactive.")

        return self.get_tokens_for_user(user)

    def get_tokens_for_user(self, user: User) -> tuple[str, str]:
        """Generate access and refresh tokens for a user."""
        claims = {"role": user.role.name if user.role else None}
        access_token = create_access_token(str(user.id), extra_claims=claims)
        refresh_token = create_refresh_token(str(user.id), extra_claims=claims)
        return access_token, refresh_token

    def refresh(self, refresh_token: str) -> tuple[str, str]:
        try:
            payload = decode_token(refresh_token)
        except ValueError as exc:
            raise UnauthorizedException("Invalid or expired refresh token.") from exc

        if payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid token type.")

        jti = payload.get("jti")
        if jti and self.blacklist_repo.is_blacklisted(jti):
            raise UnauthorizedException("Refresh token has been revoked.")

        user_id = payload.get("sub")
        user = self.user_repo.get_with_role(int(user_id)) if user_id else None
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive.")

        # Rotate: blacklist the old refresh token, then issue a new pair.
        if jti:
            expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            self.blacklist_repo.add(jti, expires_at)

        claims = {"role": user.role.name if user.role else None}
        access_token = create_access_token(str(user.id), extra_claims=claims)
        new_refresh_token = create_refresh_token(str(user.id), extra_claims=claims)
        return access_token, new_refresh_token

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except ValueError:
            return

        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp and not self.blacklist_repo.is_blacklisted(jti):
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            self.blacklist_repo.add(jti, expires_at)

    def change_password(self, user: User, payload: ChangePasswordRequest) -> None:
        if not verify_password(payload.old_password, user.password):
            raise BadRequestException("Old password is incorrect.")
        user.password = hash_password(payload.new_password)
        self.db.commit()

    def update_profile(self, user: User, payload: UserUpdate) -> User:
        data = payload.model_dump(exclude_unset=True)
        return self.user_repo.update(user, data)