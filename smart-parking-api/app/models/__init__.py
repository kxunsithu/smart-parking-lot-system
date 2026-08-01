"""Import all models here so Alembic / Base.metadata can discover them."""
from app.database.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.parking_owner import ParkingOwner
from app.models.parking_lot import ParkingLot
from app.models.parking_staff import ParkingStaff
from app.models.customer import Customer
from app.models.car import Car
from app.models.parking_floor import ParkingFloor
from app.models.parking_slot import ParkingSlot
from app.models.parking_session import ParkingSession
from app.models.token_blacklist import TokenBlacklist
from app.models.otp import OTP
from app.models.package import Package
from app.models.owner_subscription import OwnerSubscription
from app.models.payment import Payment

__all__ = [
    "Base",
    "Role",
    "User",
    "ParkingOwner",
    "ParkingLot",
    "ParkingStaff",
    "Customer",
    "Car",
    "ParkingFloor",
    "ParkingSlot",
    "ParkingSession",
    "TokenBlacklist",
    "OTP",
    "Package",
    "OwnerSubscription",
    "Payment",
]

