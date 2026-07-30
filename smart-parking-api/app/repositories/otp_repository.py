from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.otp import OTP
from app.repositories.base import BaseRepository


class OTPRepository(BaseRepository[OTP]):
    model = OTP

    def __init__(self, db: Session):
        super().__init__(db)

    def get_by_email(self, email: str) -> OTP | None:
        stmt = select(self.model).where(self.model.email == email).order_by(self.model.created_at.desc()).limit(1)
        return self.db.scalar(stmt)

    def mark_used(self, otp: OTP) -> OTP:
        otp.is_used = True
        self.db.commit()
        self.db.refresh(otp)
        return otp

    def delete_by_email(self, email: str) -> None:
        stmt = sa_delete(self.model).where(self.model.email == email)
        self.db.execute(stmt)
        self.db.commit()

    def cleanup_expired(self) -> None:
        expiry_threshold = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=settings.OTP_EXPIRE_MINUTES + 5)
        stmt = sa_delete(self.model).where(self.model.created_at < expiry_threshold)
        self.db.execute(stmt)
        self.db.commit()
