from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class TokenBlacklist(Base):
    """Stores revoked refresh token identifiers (jti) so logout persists across requests."""

    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
