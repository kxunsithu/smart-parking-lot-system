"""Application configuration loaded from environment variables / .env file."""
import json
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str
    APP_ENV: str
    DEBUG: bool
    API_V1_PREFIX: str

    # Database
    DATABASE_URL: str

    # JWT / Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return []

    # Pagination defaults
    DEFAULT_PAGE_SIZE: int
    MAX_PAGE_SIZE: int

    # Billing
    DEFAULT_HOURLY_RATE: float

    # Default Admin (used by seed script)
    DEFAULT_ADMIN_NAME: str
    DEFAULT_ADMIN_EMAIL: str
    DEFAULT_ADMIN_PASSWORD: str
    DEFAULT_ADMIN_PHONE: str

    # Email / SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Smart Parking System"
    SMTP_USE_TLS: bool = True

    # OTP Configuration
    OTP_EXPIRE_MINUTES: int
    OTP_LENGTH: int

    # Digital Wallet Integration (external system API)
    # API keys are configured per WalletAccount (admin platform + per-owner), not globally.
    WALLET_API_BASE_URL: str = ""
    WALLET_REFERENCE_PREFIX: str = "PP"
    # Publicly reachable base URL of THIS API. The wallet hosted payment page
    # redirects the customer's browser back here after OTP/PIN is entered.
    WALLET_REDIRECT_BASE_URL: str = "http://localhost:8000"
    # Frontend base URLs the callback redirects the browser to after finalizing.
    CUSTOMER_APP_URL: str = "http://localhost:5174"
    MANAGEMENT_APP_URL: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
