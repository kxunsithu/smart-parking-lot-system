"""Repository for ReservationPayment model."""
from sqlalchemy.orm import Session

from app.models.reservation_payment import ReservationPayment
from app.repositories.base_repository import BaseRepository


class ReservationPaymentRepository(BaseRepository[ReservationPayment]):
    def __init__(self, db: Session):
        super().__init__(db, ReservationPayment)

    def get_by_reservation_id(self, reservation_id: int) -> list[ReservationPayment]:
        return self.db.query(ReservationPayment).filter(
            ReservationPayment.reservation_id == reservation_id
        ).all()

    def get_by_customer_id(self, customer_id: int) -> list[ReservationPayment]:
        return self.db.query(ReservationPayment).filter(
            ReservationPayment.customer_id == customer_id
        ).all()
