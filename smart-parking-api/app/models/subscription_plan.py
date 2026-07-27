"""Subscription plan model for business license packages."""
from sqlalchemy import Column, DateTime, Float, Integer, String

from app.database.base import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "1 Year", "2 Years"
    description = Column(String(500), nullable=True)
    duration_months = Column(Integer, nullable=False)  # e.g., 12, 24
    price = Column(Float, nullable=False)  # Price in currency
    max_parking_lots = Column(Integer, nullable=False)  # Max lots allowed
    max_staff = Column(Integer, nullable=False)  # Max staff allowed
    is_active = Column(Integer, default=1)  # 0 = inactive, 1 = active
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
