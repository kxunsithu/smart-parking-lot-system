from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import SessionStatus
from app.database.base import Base


class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False)
    slot_id: Mapped[int] = mapped_column(ForeignKey("parking_slots.id"), nullable=False)
    entry_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # minutes
    fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SessionStatus.ACTIVE.value, index=True)

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="sessions")
    slot: Mapped["ParkingSlot"] = relationship("ParkingSlot", back_populates="sessions")
    payments: Mapped[List["ParkingSessionPayment"]] = relationship("ParkingSessionPayment", back_populates="parking_session")
