from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import PaymentMethod, PaymentStatus
from app.database.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parking_session_id: Mapped[int] = mapped_column(ForeignKey("parking_sessions.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    reservation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("reservations.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default=PaymentMethod.CASH.value)
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PAID.value, index=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    parking_session: Mapped["ParkingSession"] = relationship("ParkingSession", back_populates="payments")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="payments")
    reservation: Mapped[Optional["Reservation"]] = relationship("Reservation", back_populates="payment")
