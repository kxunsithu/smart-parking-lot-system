from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ParkingLot(Base):
    __tablename__ = "parking_lots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("parking_owners.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    google_map_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="PUBLIC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_per_hour: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # owner-set hourly rate
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner: Mapped["ParkingOwner"] = relationship("ParkingOwner", back_populates="parking_lots")
    staff: Mapped[List["ParkingStaff"]] = relationship(
        "ParkingStaff", back_populates="parking_lot", cascade="all, delete-orphan"
    )
    floors: Mapped[List["ParkingFloor"]] = relationship(
        "ParkingFloor", back_populates="parking_lot", cascade="all, delete-orphan"
    )
