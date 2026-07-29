from typing import Optional

from sqlalchemy import select

from app.models.vehicle import Vehicle
from app.repositories.base import BaseRepository


class VehicleRepository(BaseRepository[Vehicle]):
    model = Vehicle

    def get_by_plate_number(self, plate_number: str) -> Optional[Vehicle]:
        return self.db.scalar(select(Vehicle).where(Vehicle.plate_number == plate_number))

    def list_by_customer(self, customer_id: int) -> list[Vehicle]:
        return list(self.db.scalars(select(Vehicle).where(Vehicle.customer_id == customer_id)))
