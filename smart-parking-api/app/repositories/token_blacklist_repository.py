from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, select

from app.models.token_blacklist import TokenBlacklist
from app.repositories.base import BaseRepository


class TokenBlacklistRepository(BaseRepository[TokenBlacklist]):
    model = TokenBlacklist

    def is_blacklisted(self, jti: str) -> bool:
        return self.db.scalar(select(TokenBlacklist).where(TokenBlacklist.jti == jti)) is not None

    def add(self, jti: str, expires_at: datetime) -> TokenBlacklist:
        entry = TokenBlacklist(jti=jti, expires_at=expires_at)
        return self.create(entry)

    def purge_expired(self) -> None:
        self.db.execute(delete(TokenBlacklist).where(TokenBlacklist.expires_at < datetime.now(timezone.utc)))
        self.db.commit()
