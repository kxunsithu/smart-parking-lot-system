"""Pydantic schemas for WalletAccount (digital wallet receiver credentials)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WalletAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Friendly label for the account.")
    wallet_phone: Optional[str] = Field(
        default=None, max_length=20, description="Digital wallet phone of the receiving account (optional)."
    )
    api_key: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="X-API-Key of the external system registered in the digital wallet backend.",
    )


class WalletAccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    wallet_phone: Optional[str] = Field(default=None, max_length=20)
    api_key: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_active: Optional[bool] = Field(default=None)


class WalletAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: Optional[int] = None
    name: str
    wallet_phone: Optional[str] = None
    api_key: Optional[str] = None
    api_key_masked: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    owner: Optional[dict] = None


class WalletAccountResolveRequest(BaseModel):
    api_key: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="X-API-Key of the external system registered in the digital wallet backend.",
    )


class WalletAccountResolveOut(BaseModel):
    """Details returned by the digital wallet backend for a given API key."""

    name: str = Field(default="", description="External system name.")
    account_name: Optional[str] = Field(default=None, description="Wallet account holder name (agent).")
    wallet_phone: Optional[str] = Field(default=None, description="Wallet phone number (agent).")
    system_link: Optional[str] = Field(default=None, description="External system web link.")
