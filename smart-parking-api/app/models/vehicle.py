"""SQLAlchemy model for a customer vehicle."""
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.parking_session import ParkingSession


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="vehicles")
    sessions: Mapped[List["ParkingSession"]] = relationship("ParkingSession", back_populates="vehicle")
