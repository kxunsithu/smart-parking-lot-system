from typing import Optional

from sqlalchemy import select

from app.models.parking_staff import ParkingStaff
from app.repositories.base import BaseRepository


class ParkingStaffRepository(BaseRepository[ParkingStaff]):
    model = ParkingStaff

    def get_by_user_id(self, user_id: int) -> Optional[ParkingStaff]:
        return self.db.scalar(select(ParkingStaff).where(ParkingStaff.user_id == user_id))
