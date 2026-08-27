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
    RESERVED = "RESERVED"


class SessionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    FINISHED = "FINISHED"


class SubscriptionStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class LotType(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"
