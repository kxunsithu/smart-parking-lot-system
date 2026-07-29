"""OTP service for generating and verifying OTP codes."""
import random
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.core.exceptions import BadRequestException
from app.models.otp import OTP
from app.repositories.otp_repository import OTPRepository
from app.repositories.user_repository import UserRepository
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class OTPService:
    def __init__(self, db: Session):
        self.db = db
        self.otp_repo = OTPRepository(db)
        self.user_repo = UserRepository(db)
        self.email_service = EmailService()

    async def generate_otp(self, email: str) -> str:
        """Generate and send OTP code to email."""
        # Clean up expired OTPs first
        self.otp_repo.cleanup_expired()

        # Generate random OTP code
        otp_code = "".join([str(random.randint(0, 9)) for _ in range(settings.OTP_LENGTH)])

        # Calculate expiry time (store as naive UTC for SQLite compatibility)
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        # Delete any existing OTP for this email
        self.otp_repo.delete_by_email(email)

        # Create new OTP
        otp = OTP(
            email=email,
            code=otp_code,
            expires_at=expires_at,
            is_used=False,
        )
        self.otp_repo.create(otp)

        # Send email
        await self.email_service.send_otp_email(email, otp_code)

        return otp_code

    def verify_otp(self, email: str, code: str) -> bool:
        """Verify OTP code for email."""
        # Clean up expired OTPs
        self.otp_repo.cleanup_expired()

        # Get latest OTP for this email
        otp = self.otp_repo.get_by_email(email)

        if not otp:
            raise BadRequestException("Invalid or expired OTP code.")

        if otp.is_used:
            raise BadRequestException("OTP code already used.")

        # Compare naive UTC datetimes
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if otp.expires_at < now_utc:
            raise BadRequestException("OTP code has expired.")

        if otp.code != code:
            raise BadRequestException("Invalid OTP code.")

        # Mark as used. We intentionally do NOT delete the OTP here so that
        # the registration flow can confirm a successful verification happened.
        # The OTP will be cleaned up by cleanup_expired() once it expires.
        self.otp_repo.mark_used(otp)

        # Mark the user as verified
        user = self.user_repo.get_by_email(email)
        if user:
            self.user_repo.update(user, {"is_verified": True})

        return True
