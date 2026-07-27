from typing import List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ParkingFloor(Base):
    __tablename__ = "parking_floors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parking_lot_id: Mapped[int] = mapped_column(ForeignKey("parking_lots.id"), nullable=False)
    floor_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    parking_lot: Mapped["ParkingLot"] = relationship("ParkingLot", back_populates="floors")
    slots: Mapped[List["ParkingSlot"]] = relationship(
        "ParkingSlot", back_populates="floor", cascade="all, delete-orphan"
    )
