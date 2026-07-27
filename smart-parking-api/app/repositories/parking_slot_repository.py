from app.models.parking_slot import ParkingSlot
from app.repositories.base import BaseRepository


class ParkingSlotRepository(BaseRepository[ParkingSlot]):
    model = ParkingSlot
