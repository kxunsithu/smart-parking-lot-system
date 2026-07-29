"""Shared enums / constants for roles and statuses."""
from enum import Enum


class RoleName(str, Enum):
    ADMIN = "ADMIN"
    OWNER = "OWNER"
    STAFF = "STAFF"
    CUSTOMER = "CUSTOMER"


class SlotStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"


class SessionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    FINISHED = "FINISHED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    CASH = "CASH"
    KBZPAY = "KBZPAY"
    WAVEPAY = "WAVEPAY"
    AYAPAY = "AYAPAY"
    UABPAY = "UABPAY"


class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"
