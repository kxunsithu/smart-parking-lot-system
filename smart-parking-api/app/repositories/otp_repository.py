"""OTP repository for database operations."""
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.otp import OTP
from app.repositories.base import BaseRepository


class OTPRepository(BaseRepository[OTP]):
    model = OTP

    def __init__(self, db: Session):
        super().__init__(db)

    def get_by_email(self, email: str) -> OTP | None:
        return self.db.query(self.model).filter(self.model.email == email).order_by(self.model.created_at.desc()).first()

    def mark_used(self, otp: OTP) -> OTP:
        otp.is_used = True
        self.db.commit()
        self.db.refresh(otp)
        return otp

    def delete_by_email(self, email: str) -> None:
        self.db.query(self.model).filter(self.model.email == email).delete()
        self.db.commit()

    def cleanup_expired(self) -> None:
        """Delete expired OTPs older than the configured expiry time."""
        expiry_threshold = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=settings.OTP_EXPIRE_MINUTES + 5)
        self.db.query(self.model).filter(self.model.created_at < expiry_threshold).delete()
        self.db.commit()
