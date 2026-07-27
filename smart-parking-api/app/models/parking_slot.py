from typing import List, Optional

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import SlotStatus
from app.database.base import Base


class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey("parking_floors.id"), nullable=False)
    slot_number: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SlotStatus.AVAILABLE.value, index=True)

    floor: Mapped["ParkingFloor"] = relationship("ParkingFloor", back_populates="slots")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="slot")
    sessions: Mapped[List["ParkingSession"]] = relationship("ParkingSession", back_populates="slot")
