"""Repository for ParkingSessionPayment model."""
from sqlalchemy.orm import Session

from app.models.parking_session_payment import ParkingSessionPayment
from app.repositories.base_repository import BaseRepository


class ParkingSessionPaymentRepository(BaseRepository[ParkingSessionPayment]):
    def __init__(self, db: Session):
        super().__init__(db, ParkingSessionPayment)

    def get_by_session_id(self, session_id: int) -> list[ParkingSessionPayment]:
        return self.db.query(ParkingSessionPayment).filter(
            ParkingSessionPayment.parking_session_id == session_id
        ).all()

    def get_by_customer_id(self, customer_id: int) -> list[ParkingSessionPayment]:
        return self.db.query(ParkingSessionPayment).filter(
            ParkingSessionPayment.customer_id == customer_id
        ).all()
