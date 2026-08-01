"""SQLAlchemy model for a parking session (car entry → exit at a slot)."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import SessionStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.car import Car
    from app.models.parking_slot import ParkingSlot


class ParkingSession(Base):
    __tablename__ = "parking_sessions"
    __table_args__ = (
        Index("ix_parking_sessions_car_id", "car_id"),
        Index("ix_parking_sessions_car_status", "car_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), nullable=False)
    slot_id: Mapped[int] = mapped_column(ForeignKey("parking_slots.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # minutes
    fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default=SessionStatus.ACTIVE.value, index=True, nullable=False
    )

    car: Mapped["Car"] = relationship("Car", back_populates="sessions")
    slot: Mapped["ParkingSlot"] = relationship("ParkingSlot", back_populates="sessions")
