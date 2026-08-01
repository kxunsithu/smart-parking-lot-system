from typing import Optional

from sqlalchemy import select

from app.models.car import Car
from app.repositories.base import BaseRepository


class CarRepository(BaseRepository[Car]):
    model = Car

    def get_by_plate_number(self, plate_number: str) -> Optional[Car]:
        return self.db.scalar(select(Car).where(Car.plate_number == plate_number))

    def list_by_customer(self, customer_id: int) -> list[Car]:
        return list(self.db.scalars(select(Car).where(Car.customer_id == customer_id)))
