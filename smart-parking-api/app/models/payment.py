"""Wallet payment record linking parking sessions / subscriptions to the digital wallet."""
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import PaymentStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.owner_subscription import OwnerSubscription
    from app.models.parking_session import ParkingSession
    from app.models.user import User
    from app.models.wallet_account import WalletAccount


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_session_id", "session_id"),
        Index("ix_payments_subscription_id", "subscription_id"),
        Index("ix_payments_wallet_account_id", "wallet_account_id"),
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
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("owner_subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    # Parking-side unique reference (e.g. PP-XXXXXX).
    reference: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    # Reference returned by the digital wallet external payment API (e.g. PAY-XXXX).
    wallet_payment_reference: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # Transaction number returned once the wallet confirms the payment (e.g. TX-XXXX).
    wallet_transaction_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=PaymentStatus.PENDING.value, index=True, nullable=False
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="payments")
    wallet_account: Mapped[Optional["WalletAccount"]] = relationship(
        "WalletAccount", back_populates="payments"
    )
    session: Mapped[Optional["ParkingSession"]] = relationship(
        "ParkingSession", back_populates="payments"
    )
    subscription: Mapped[Optional["OwnerSubscription"]] = relationship(
        "OwnerSubscription", back_populates="payments"
    )
