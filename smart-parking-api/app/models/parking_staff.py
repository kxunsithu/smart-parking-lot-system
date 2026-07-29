from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ParkingStaff(Base):
    __tablename__ = "parking_staff"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    parking_lot_id: Mapped[int] = mapped_column(ForeignKey("parking_lots.id"), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="staff_profile")
    parking_lot: Mapped["ParkingLot"] = relationship("ParkingLot", back_populates="staff")
