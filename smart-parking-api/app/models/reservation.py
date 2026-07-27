from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import ReservationStatus
from app.database.base import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    slot_id: Mapped[int] = mapped_column(ForeignKey("parking_slots.id"), nullable=False)
    reservation_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ReservationStatus.PENDING.value, index=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="reservations")
    slot: Mapped["ParkingSlot"] = relationship("ParkingSlot", back_populates="reservations")
    payment: Mapped[Optional["Payment"]] = relationship("Payment", back_populates="reservation", uselist=False)
