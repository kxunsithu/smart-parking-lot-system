from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_verified: Mapped[bool] = mapped_column(default=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    role: Mapped["Role"] = relationship("Role", back_populates="users")

    owner_profile: Mapped[Optional["ParkingOwner"]] = relationship(
        "ParkingOwner", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    staff_profile: Mapped[Optional["ParkingStaff"]] = relationship(
        "ParkingStaff", back_populates="user", uselist=False, cascade="all, delete-orphan",
        foreign_keys="ParkingStaff.user_id"
    )
    customer_profile: Mapped[Optional["Customer"]] = relationship(
        "Customer", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="user", cascade="all, delete-orphan"
    )
