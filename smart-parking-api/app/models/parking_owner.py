from typing import List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ParkingOwner(Base):
    __tablename__ = "parking_owners"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="owner_profile")
    parking_lots: Mapped[List["ParkingLot"]] = relationship(
        "ParkingLot", back_populates="owner", cascade="all, delete-orphan"
    )
