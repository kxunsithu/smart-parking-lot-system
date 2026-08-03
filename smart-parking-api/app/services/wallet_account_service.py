"""Business logic for WalletAccount management (admin platform + owner accounts)."""
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.user import User
from app.models.wallet_account import WalletAccount
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.wallet_account_repository import WalletAccountRepository
from app.schemas.wallet_account import WalletAccountCreate, WalletAccountUpdate


def _mask_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None
    if len(api_key) <= 8:
        return "•" * len(api_key)
    return f"{api_key[:4]}••••••••{api_key[-4:]}"


def serialize_wallet_account(account: WalletAccount, include_key: bool = False) -> dict:
    owner = account.owner
    return {
        "id": account.id,
        "owner_id": account.owner_id,
        "name": account.name,
        "wallet_phone": account.wallet_phone,
        "api_key": account.api_key if include_key else None,
        "api_key_masked": _mask_api_key(account.api_key),
        "is_active": account.is_active,
        "created_at": account.created_at,
        "updated_at": account.updated_at,
        "owner": (
            {
                "id": owner.id,
                "name": owner.user.name if owner.user else None,
                "email": owner.user.email if owner.user else None,
            }
            if owner
            else None
        ),
    }


class WalletAccountService:
    def __init__(self, db: Session):
        self.db = db
        self.account_repo = WalletAccountRepository(db)
        self.owner_repo = ParkingOwnerRepository(db)

    def _owner_id_for(self, current_user: User) -> int:
        owner = self.owner_repo.get_by_user_id(current_user.id)
        if not owner:
            raise ForbiddenException("Owner profile not found.")
        return owner.id

    # ─── Platform (admin) account ────────────────────────────────────────────

    def get_platform(self) -> WalletAccount | None:
        return self.account_repo.get_platform_account()

    def require_platform(self) -> WalletAccount:
        account = self.account_repo.get_platform_account()
        if not account:
            raise NotFoundException("The platform payment account has not been configured.")
        return account

    def upsert_platform(self, payload: WalletAccountCreate) -> WalletAccount:
        existing = self.account_repo.get_platform_account()
        if existing:
            raise ConflictException("A platform payment account already exists. Update it instead.")
        account = WalletAccount(
            owner_id=None,
            name=payload.name,
            wallet_phone=payload.wallet_phone,
            api_key=payload.api_key,
            is_active=True,
        )
        return self.account_repo.create(account)

    def update_platform(self, payload: WalletAccountUpdate) -> WalletAccount:
        account = self.require_platform()
        data = payload.model_dump(exclude_unset=True, exclude_none=True)
        return self.account_repo.update(account, data)

    def delete_platform(self) -> None:
        account = self.require_platform()
        self.account_repo.delete(account)

    # ─── Owner account ───────────────────────────────────────────────────────

    def get_owner_account(self, current_user: User) -> WalletAccount | None:
        return self.account_repo.get_by_owner_id(self._owner_id_for(current_user))

    def require_owner_account(self, current_user: User) -> WalletAccount:
        account = self.get_owner_account(current_user)
        if not account:
            raise NotFoundException("You have not configured your wallet payment account yet.")
        return account

    def create_owner_account(self, current_user: User, payload: WalletAccountCreate) -> WalletAccount:
        owner_id = self._owner_id_for(current_user)
        existing = self.account_repo.get_by_owner_id(owner_id)
        if existing:
            raise ConflictException("You already have a wallet payment account. Update it instead.")
        account = WalletAccount(
            owner_id=owner_id,
            name=payload.name,
            wallet_phone=payload.wallet_phone,
            api_key=payload.api_key,
            is_active=True,
        )
        return self.account_repo.create(account)

    def update_owner_account(self, current_user: User, payload: WalletAccountUpdate) -> WalletAccount:
        account = self.require_owner_account(current_user)
        data = payload.model_dump(exclude_unset=True, exclude_none=True)
        return self.account_repo.update(account, data)

    def delete_owner_account(self, current_user: User) -> None:
        account = self.require_owner_account(current_user)
        self.account_repo.delete(account)

    # ─── Admin listing ───────────────────────────────────────────────────────

    def list_all(self) -> list[WalletAccount]:
        accounts = list(self.db.query(WalletAccount).order_by(WalletAccount.id.desc()).all())
        return accounts

    @staticmethod
    def can_manage(account: WalletAccount, current_user: User) -> bool:
        if current_user.role.name == RoleName.ADMIN.value:
            return True
        owner = account.owner
        return owner is not None and owner.user_id == current_user.id
