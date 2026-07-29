"""Repository for ParkingSession model."""
from app.models.parking_session import ParkingSession
from app.repositories.base import BaseRepository


class ParkingSessionRepository(BaseRepository[ParkingSession]):
    model = ParkingSession
