"""SQLAlchemy model for a parking slot."""
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import SlotStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.parking_floor import ParkingFloor
    from app.models.parking_session import ParkingSession


class ParkingSlot(Base):
    __tablename__ = "parking_slots"
    __table_args__ = (
        UniqueConstraint("floor_id", "slot_number", name="uq_parking_slots_floor_slot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    floor_id: Mapped[int] = mapped_column(ForeignKey("parking_floors.id"), nullable=False)
    slot_number: Mapped[str] = mapped_column(String(20), nullable=False)
    section: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SlotStatus.AVAILABLE.value, index=True)

    floor: Mapped["ParkingFloor"] = relationship("ParkingFloor", back_populates="slots")
    sessions: Mapped[List["ParkingSession"]] = relationship("ParkingSession", back_populates="slot")
