"""Subscription plan model for business license packages."""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.database.base import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Standard Plan"
    description = Column(String(500), nullable=True)
    per_slot_price = Column(Float, nullable=False)  # Price per slot
    is_active = Column(Integer, default=1)  # 0 = inactive, 1 = active
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True)
