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
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    FINISHED = "FINISHED"


class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class LotType(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"
