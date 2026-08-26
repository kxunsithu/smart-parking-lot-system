"""Aggregated statistics for role-specific dashboards."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import PaymentStatus, SessionStatus, SlotStatus
from app.core.exceptions import NotFoundException
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.repositories.parking_owner_repository import ParkingOwnerRepository
from app.repositories.parking_staff_repository import ParkingStaffRepository
from app.schemas.dashboard import AdminDashboardOut, OwnerDashboardOut, StaffDashboardOut


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.owner_repo = ParkingOwnerRepository(db)
        self.staff_repo = ParkingStaffRepository(db)

    def admin_dashboard(self) -> AdminDashboardOut:
        total_owners = self.db.scalar(select(func.count()).select_from(ParkingOwner)) or 0
        total_staff = self.db.scalar(select(func.count()).select_from(ParkingStaff)) or 0
        total_customers = self.db.scalar(select(func.count()).select_from(Customer)) or 0
        total_parking_lots = self.db.scalar(select(func.count()).select_from(ParkingLot)) or 0
        total_revenue = (
            self.db.scalar(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.status == PaymentStatus.COMPLETED.value
                )
            )
            or 0
        )

        return AdminDashboardOut(
            total_owners=total_owners,
            total_staff=total_staff,
            total_customers=total_customers,
            total_parking_lots=total_parking_lots,
            total_revenue=float(total_revenue),
        )

    def owner_dashboard(self, user_id: int) -> OwnerDashboardOut:
        owner = self.owner_repo.get_by_user_id(user_id)
        if not owner:
            raise NotFoundException("Owner profile not found for the current user.")

        lot_ids = [lot.id for lot in owner.parking_lots]
        total_parking_lots = len(lot_ids)

        if not lot_ids:
            return OwnerDashboardOut(
                total_parking_lots=0,
                total_floors=0,
                available_slots=0,
                occupied_slots=0,
                total_staff=0,
                total_sessions=0,
                total_revenue=0.0,
            )

        floor_ids = [
            floor.id
            for floor in self.db.scalars(
                select(ParkingFloor).where(ParkingFloor.parking_lot_id.in_(lot_ids))
            ).all()
        ]
        total_floors = len(floor_ids)

        slots = (
            list(
                self.db.scalars(
                    select(ParkingSlot).where(ParkingSlot.floor_id.in_(floor_ids))
                ).all()
            )
            if floor_ids
            else []
        )
        available_slots = sum(1 for s in slots if s.status == SlotStatus.AVAILABLE.value)
        occupied_slots = sum(1 for s in slots if s.status == SlotStatus.OCCUPIED.value)

        total_staff = (
            self.db.scalar(
                select(func.count()).select_from(ParkingStaff).where(
                    ParkingStaff.parking_lot_id.in_(lot_ids)
                )
            )
            or 0
        )

        slot_ids = [s.id for s in slots]
        total_sessions = (
            self.db.scalar(
                select(func.count()).select_from(ParkingSession).where(
                    ParkingSession.slot_id.in_(slot_ids)
                )
            )
            if slot_ids
            else 0
        ) or 0

        session_ids = (
            [
                s.id
                for s in self.db.scalars(
                    select(ParkingSession).where(ParkingSession.slot_id.in_(slot_ids))
                ).all()
            ]
            if slot_ids
            else []
        )

        total_revenue = (
            self.db.scalar(
                select(func.coalesce(func.sum(ParkingSession.fee), 0)).where(
                    ParkingSession.id.in_(session_ids),
                    ParkingSession.status == SessionStatus.FINISHED.value,
                )
            )
            if session_ids
            else 0
        ) or 0

        return OwnerDashboardOut(
            total_parking_lots=total_parking_lots,
            total_floors=total_floors,
            available_slots=available_slots,
            occupied_slots=occupied_slots,
            total_staff=total_staff,
            total_sessions=total_sessions,
            total_revenue=float(total_revenue),
        )

    def staff_dashboard(self, user_id: int) -> StaffDashboardOut:
        staff = self.staff_repo.get_by_user_id(user_id)
        if not staff:
            raise NotFoundException("Staff profile not found for the current user.")

        floor_ids = [
            f.id
            for f in self.db.scalars(
                select(ParkingFloor).where(ParkingFloor.parking_lot_id == staff.parking_lot_id)
            ).all()
        ]
        slots = (
            list(
                self.db.scalars(
                    select(ParkingSlot).where(ParkingSlot.floor_id.in_(floor_ids))
                ).all()
            )
            if floor_ids
            else []
        )
        slot_ids = [s.id for s in slots]

        available_slots = sum(1 for s in slots if s.status == SlotStatus.AVAILABLE.value)
        occupied_slots = sum(1 for s in slots if s.status == SlotStatus.OCCUPIED.value)

        active_sessions = (
            self.db.scalar(
                select(func.count())
                .select_from(ParkingSession)
                .where(
                    ParkingSession.slot_id.in_(slot_ids),
                    ParkingSession.status == SessionStatus.ACTIVE.value,
                )
            )
            if slot_ids
            else 0
        ) or 0

        return StaffDashboardOut(
            parking_lot_id=staff.parking_lot_id,
            available_slots=available_slots,
            occupied_slots=occupied_slots,
            active_sessions=active_sessions,
        )
