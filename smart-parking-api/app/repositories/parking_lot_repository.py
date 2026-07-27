from app.models.parking_lot import ParkingLot
from app.repositories.base import BaseRepository


class ParkingLotRepository(BaseRepository[ParkingLot]):
    model = ParkingLot
