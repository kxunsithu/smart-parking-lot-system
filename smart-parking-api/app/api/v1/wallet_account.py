"""Wallet account endpoints: admin configures the platform receiver, owners configure theirs."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.wallet_account import (
    WalletAccountCreate,
    WalletAccountOut,
    WalletAccountResolveOut,
    WalletAccountResolveRequest,
    WalletAccountUpdate,
)
from app.services.wallet_account_service import WalletAccountService, serialize_wallet_account
from app.services.wallet_payment_client import WalletPaymentClient, get_wallet_client

router = APIRouter(prefix="/wallet-accounts", tags=["Wallet Accounts"])


@router.post("/resolve", response_model=SuccessResponse[WalletAccountResolveOut])
def resolve_wallet_account(
    payload: WalletAccountResolveRequest,
    wallet_client: WalletPaymentClient = Depends(get_wallet_client),
    _: User = Depends(require_roles(RoleName.ADMIN, RoleName.OWNER)),
):
    info = wallet_client.resolve_api_key(payload.api_key)
    return {
        "success": True,
        "message": "Wallet account details resolved.",
        "data": info,
    }


# ─── Owner: manage their own receiving account ───────────────────────────────

@router.get("/me", response_model=SuccessResponse[WalletAccountOut])
def get_my_wallet_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    account = WalletAccountService(db).require_owner_account(current_user)
    return {
        "success": True,
        "message": "Wallet payment account fetched.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.post("/me", response_model=SuccessResponse[WalletAccountOut], status_code=status.HTTP_201_CREATED)
def create_my_wallet_account(
    payload: WalletAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    account = WalletAccountService(db).create_owner_account(current_user, payload)
    return {
        "success": True,
        "message": "Wallet payment account created.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.put("/me", response_model=SuccessResponse[WalletAccountOut])
def update_my_wallet_account(
    payload: WalletAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    account = WalletAccountService(db).update_owner_account(current_user, payload)
    return {
        "success": True,
        "message": "Wallet payment account updated.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_wallet_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.OWNER)),
):
    WalletAccountService(db).delete_owner_account(current_user)


# ─── Admin: manage the platform (admin) receiving account ────────────────────

@router.get("/platform", response_model=SuccessResponse[WalletAccountOut])
def get_platform_wallet_account(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    account = WalletAccountService(db).require_platform()
    return {
        "success": True,
        "message": "Platform wallet payment account fetched.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.post("/platform", response_model=SuccessResponse[WalletAccountOut], status_code=status.HTTP_201_CREATED)
def create_platform_wallet_account(
    payload: WalletAccountCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    account = WalletAccountService(db).upsert_platform(payload)
    return {
        "success": True,
        "message": "Platform wallet payment account created.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.put("/platform", response_model=SuccessResponse[WalletAccountOut])
def update_platform_wallet_account(
    payload: WalletAccountUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    account = WalletAccountService(db).update_platform(payload)
    return {
        "success": True,
        "message": "Platform wallet payment account updated.",
        "data": serialize_wallet_account(account, include_key=True),
    }


@router.delete("/platform", status_code=status.HTTP_204_NO_CONTENT)
def delete_platform_wallet_account(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    WalletAccountService(db).delete_platform()


# ─── Admin: list all accounts ────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[list[WalletAccountOut]])
def list_wallet_accounts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    accounts = WalletAccountService(db).list_all()
    return {
        "success": True,
        "message": "Wallet payment accounts fetched.",
        "data": [serialize_wallet_account(a) for a in accounts],
    }
