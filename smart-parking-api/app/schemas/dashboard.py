"""Pydantic schemas for role-specific dashboard responses."""
from pydantic import BaseModel


class AdminDashboardOut(BaseModel):
    total_owners: int
    total_staff: int
    total_customers: int
    total_parking_lots: int
    total_revenue: float


class OwnerDashboardOut(BaseModel):
    total_parking_lots: int
    total_floors: int
    available_slots: int
    occupied_slots: int
    reserved_slots: int
    total_staff: int
    total_sessions: int
    total_revenue: float


class StaffDashboardOut(BaseModel):
    parking_lot_id: int
    available_slots: int
    occupied_slots: int
    reserved_slots: int
    active_sessions: int
