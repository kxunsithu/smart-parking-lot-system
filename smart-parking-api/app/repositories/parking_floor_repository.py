from app.models.parking_floor import ParkingFloor
from app.repositories.base import BaseRepository


class ParkingFloorRepository(BaseRepository[ParkingFloor]):
    model = ParkingFloor
