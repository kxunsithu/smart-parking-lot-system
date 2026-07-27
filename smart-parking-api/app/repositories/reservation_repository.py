from app.models.reservation import Reservation
from app.repositories.base import BaseRepository


class ReservationRepository(BaseRepository[Reservation]):
    model = Reservation
