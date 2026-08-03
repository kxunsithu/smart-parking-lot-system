"""WalletAccount – a digital wallet external-system credential used to receive payments.

One account is linked to each Parking Owner (receives parking session fees) and one
optional platform account is linked to the System Admin (receives subscription fees).
Each account stores the X-API-Key of the external system registered in the digital
wallet backend; money flows into the agent wallet that owns that external system.
"""
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.parking_owner import ParkingOwner
    from app.models.payment import Payment


class WalletAccount(Base):
    __tablename__ = "wallet_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # NULL means this is the platform (admin) payment account.
    owner_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("parking_owners.id", ondelete="CASCADE"), nullable=True, unique=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    wallet_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # X-API-Key of the external system registered in the digital wallet backend.
    api_key: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner: Mapped[Optional["ParkingOwner"]] = relationship(
        "ParkingOwner", back_populates="wallet_account", uselist=False
    )
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="wallet_account")
