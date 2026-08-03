from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.wallet_account import WalletAccount


class ParkingOwner(Base):
    __tablename__ = "parking_owners"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="owner_profile")
    parking_lots: Mapped[List["ParkingLot"]] = relationship(
        "ParkingLot", back_populates="owner", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[List["OwnerSubscription"]] = relationship(
        "OwnerSubscription", back_populates="owner", cascade="all, delete-orphan"
    )
    wallet_account: Mapped[Optional["WalletAccount"]] = relationship(
        "WalletAccount", back_populates="owner", uselist=False
    )
