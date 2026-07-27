"""Subscription model for parking owner subscriptions."""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    parking_owner_id = Column(Integer, ForeignKey("parking_owners.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    total_slots = Column(Integer, nullable=False)  # Number of slots purchased
    total_price = Column(Float, nullable=False)  # Calculated total price
    status = Column(String(20), nullable=False, default="active")  # active, expired, cancelled
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True)

    parking_owner = relationship("ParkingOwner", back_populates="subscriptions")
    payments = relationship("SubscriptionPayment", back_populates="subscription")
