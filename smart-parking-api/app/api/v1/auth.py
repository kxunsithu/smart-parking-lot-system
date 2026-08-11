"""Authentication endpoints: register, login, refresh, logout, profile, password, OTP."""
from datetime import timezone

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.otp_repository import OTPRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterOwnerRequest,
    RegisterRequest,
    SendOTPRequest,
    TokenResponse,
    VerifyOTPRequest,
)
from app.schemas.common import SuccessResponse
from app.schemas.user import UserOut, UserUpdate
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/send-otp", response_model=SuccessResponse[None])
async def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    await OTPService(db).generate_otp(payload.email)
    return {"success": True, "message": "OTP sent successfully.", "data": None}


@router.get("/otp-status")
def get_otp_status(email: str, db: Session = Depends(get_db)):
    """Get OTP expiry time and usage status for an email."""
    otp_repo = OTPRepository(db)
    otp = otp_repo.get_by_email(email)
    
    if not otp:
        return {"success": True, "message": "No OTP found", "data": {"expires_at": None, "created_at": None, "is_used": None}}
    
    # Convert naive UTC datetimes to timezone-aware UTC, then to ISO format
    expires_at = otp.expires_at.replace(tzinfo=timezone.utc).isoformat() if otp.expires_at else None
    created_at = otp.created_at.replace(tzinfo=timezone.utc).isoformat() if otp.created_at else None
    
    return {"success": True, "message": "OTP status fetched", "data": {"expires_at": expires_at, "created_at": created_at, "is_used": otp.is_used}}


@router.post("/verify-otp", response_model=SuccessResponse[TokenResponse])
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    OTPService(db).verify_otp(payload.email, payload.code)

    # After successful verification, generate tokens for the user
    user_repo = UserRepository(db)
    user = user_repo.get_by_email_with_role(payload.email)
    if not user:
        raise NotFoundException("User not found after OTP verification.")

    auth_service = AuthService(db)
    access_token, refresh_token = auth_service.get_tokens_for_user(user)
    token = TokenResponse(access_token=access_token, refresh_token=refresh_token)

    return {"success": True, "message": "OTP verified successfully. User is now logged in.", "data": token}


@router.post("/register", response_model=SuccessResponse[UserOut], status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = AuthService(db).register_customer(payload)
    return {"success": True, "message": "Registration successful.", "data": user}


@router.post("/register-owner", response_model=SuccessResponse[UserOut], status_code=status.HTTP_201_CREATED)
def register_owner(payload: RegisterOwnerRequest, db: Session = Depends(get_db)):
    user = AuthService(db).register_owner(payload)
    return {"success": True, "message": "Owner registration successful.", "data": user}


@router.post("/login", response_model=SuccessResponse[TokenResponse])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = AuthService(db).authenticate(payload)
    token = TokenResponse(access_token=access_token, refresh_token=refresh_token)
    return {"success": True, "message": "Login successful.", "data": token}


@router.post("/refresh", response_model=SuccessResponse[TokenResponse])
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = AuthService(db).refresh(payload.refresh_token)
    token = TokenResponse(access_token=access_token, refresh_token=refresh_token)
    return {"success": True, "message": "Token refreshed successfully.", "data": token}


@router.post("/logout", response_model=SuccessResponse[None])
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    AuthService(db).logout(payload.refresh_token)
    return {"success": True, "message": "Logged out successfully.", "data": None}


@router.post("/change-password", response_model=SuccessResponse[None])
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    AuthService(db).change_password(current_user, payload)
    return {"success": True, "message": "Password changed successfully.", "data": None}


@router.get("/me", response_model=SuccessResponse[UserOut])
def get_me(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "Current user fetched successfully.", "data": current_user}


@router.put("/me", response_model=SuccessResponse[UserOut])
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = AuthService(db).update_profile(current_user, payload)
    return {"success": True, "message": "Profile updated successfully.", "data": user}


@router.post("/me/profile-image", response_model=SuccessResponse[UserOut])
def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = AuthService(db).upload_profile_image(current_user, file)
    return {"success": True, "message": "Profile image uploaded successfully.", "data": user}


@router.delete("/me/profile-image", response_model=SuccessResponse[UserOut])
def delete_profile_image(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = AuthService(db).delete_profile_image(current_user)
    return {"success": True, "message": "Profile image deleted successfully.", "data": user}