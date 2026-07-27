from typing import Optional

from sqlalchemy import select

from app.models.parking_owner import ParkingOwner
from app.repositories.base import BaseRepository


class ParkingOwnerRepository(BaseRepository[ParkingOwner]):
    model = ParkingOwner

    def get_by_user_id(self, user_id: int) -> Optional[ParkingOwner]:
        return self.db.scalar(select(ParkingOwner).where(ParkingOwner.user_id == user_id))
