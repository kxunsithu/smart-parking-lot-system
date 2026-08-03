"""Repository for the WalletAccount (wallet receiver credential) model."""
from sqlalchemy import select

from app.models.wallet_account import WalletAccount
from app.repositories.base import BaseRepository


class WalletAccountRepository(BaseRepository[WalletAccount]):
    model = WalletAccount

    def get_platform_account(self) -> WalletAccount | None:
        return self.db.scalar(
            select(WalletAccount).where(WalletAccount.owner_id.is_(None)).limit(1)
        )

    def get_by_owner_id(self, owner_id: int) -> WalletAccount | None:
        return self.db.scalar(
            select(WalletAccount).where(WalletAccount.owner_id == owner_id).limit(1)
        )

    def list_with_owners(self) -> list[WalletAccount]:
        return list(
            self.db.scalars(
                select(WalletAccount)
                .options_from_entity(WalletAccount)
                .order_by(WalletAccount.id.desc())
            ).all()
        )
