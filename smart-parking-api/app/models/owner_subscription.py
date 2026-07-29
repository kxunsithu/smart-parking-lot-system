"""OwnerSubscription model – tracks packages purchased by owners."""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.core.constants import SubscriptionStatus


class OwnerSubscription(Base):
    __tablename__ = "owner_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("parking_owners.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package_id: Mapped[int] = mapped_column(
        ForeignKey("packages.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=SubscriptionStatus.ACTIVE.value, nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(50), default="CASH", nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    transaction_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    owner: Mapped["ParkingOwner"] = relationship("ParkingOwner", back_populates="subscriptions")
    package: Mapped["Package"] = relationship("Package", back_populates="subscriptions")
