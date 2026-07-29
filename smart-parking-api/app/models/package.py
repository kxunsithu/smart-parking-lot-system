"""Package model – defines subscription tiers admin can offer."""
from datetime import datetime, timezone
from typing import List

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    max_lots: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_staff: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    subscriptions: Mapped[List["OwnerSubscription"]] = relationship(
        "OwnerSubscription", back_populates="package"
    )
