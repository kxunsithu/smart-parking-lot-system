"""PendingWalletPayment – tracks an in-flight external wallet payment before completion.

The real transaction record (Payment) is only created once the digital wallet
backend confirms the payment is completed, so nothing is recorded for initiated
but unfinished payments.

For subscription payments: pending_package_id + pending_owner_id + is_renewal are
stored here instead of creating a PENDING subscription up-front. The subscription
record is created with ACTIVE status only after payment succeeds.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class PendingWalletPayment(Base):
    __tablename__ = "pending_wallet_payments"
    __table_args__ = (
        Index("ix_pending_wallet_payments_session_id", "session_id"),
        Index("ix_pending_wallet_payments_subscription_id", "subscription_id"),
        Index("ix_pending_wallet_payments_wallet_account_id", "wallet_account_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    # Wallet account whose API key was used (i.e. who receives the money).
    wallet_account_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("wallet_accounts.id", ondelete="SET NULL"), nullable=True
    )
    session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("parking_sessions.id", ondelete="SET NULL"), nullable=True
    )
    # Populated after completion – links the Payment record back to the subscription
    # that was created on success. Not set before payment completes.
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("owner_subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    # ── Deferred-subscription fields ──────────────────────────────────────────
    # Stored here so we can create the subscription record only after payment
    # is confirmed, avoiding PENDING subscription rows.
    pending_package_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("packages.id", ondelete="SET NULL"), nullable=True
    )
    pending_owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("parking_owners.id", ondelete="SET NULL"), nullable=True
    )
    is_renewal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # ──────────────────────────────────────────────────────────────────────────
    # Parking-side unique reference (e.g. PP-XXXXXX).
    reference: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    # Reference returned by the digital wallet external payment API (e.g. PAY-XXXX).
    wallet_payment_reference: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # Hosted payment page URL on the wallet backend the customer is redirected to.
    wallet_payment_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
