"""SQLAlchemy model for a payment linked to a parking session."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import PaymentMethod, PaymentStatus
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.parking_session import ParkingSession
    from app.models.customer import Customer


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "payment_method IN ('CASH', 'KBZPAY', 'WAVEPAY', 'AYAPAY', 'UABPAY')",
            name="ck_payments_payment_method",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parking_session_id: Mapped[int] = mapped_column(
        ForeignKey("parking_sessions.id"), nullable=False
    )
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(
        String(50), default=PaymentMethod.CASH.value, nullable=False
    )
    transaction_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default=PaymentStatus.PAID.value, index=True, nullable=False
    )
    paid_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    parking_session: Mapped[Optional["ParkingSession"]] = relationship(
        "ParkingSession", back_populates="payment"
    )
    customer: Mapped["Customer"] = relationship("Customer", back_populates="payments")
