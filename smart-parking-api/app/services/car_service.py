"""Business logic for Cars."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.car import Car
from app.models.user import User
from app.repositories.car_repository import CarRepository
from app.repositories.customer_repository import CustomerRepository
from app.schemas.car import CarCreate, CarUpdate
from app.schemas.common import PaginationParams, build_meta


class CarService:
    def __init__(self, db: Session):
        self.db = db
        self.car_repo = CarRepository(db)
        self.customer_repo = CustomerRepository(db)

    def _resolve_customer_id(self, current_user: User, requested_customer_id: int | None) -> int:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value):
            if not requested_customer_id:
                raise ForbiddenException("customer_id is required for Admin/Staff.")
            if not self.customer_repo.get(requested_customer_id):
                raise NotFoundException("Customer not found.")
            return requested_customer_id

        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer:
            raise ForbiddenException("Only Customers can register cars.")
        return customer.id

    def create_car(self, payload: CarCreate, current_user: User) -> Car:
        if self.car_repo.get_by_plate_number(payload.plate_number):
            raise ConflictException(
                "Validation failed.",
                errors=[{"field": "plate_number", "message": "Plate number already exists."}],
            )

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)
        car = Car(
            customer_id=customer_id,
            plate_number=payload.plate_number,
            brand=payload.brand,
            color=payload.color,
        )
        return self.car_repo.create(car)

    def get_by_id(self, car_id: int) -> Car:
        car = self.car_repo.get(car_id)
        if not car:
            raise NotFoundException("Resource not found.")
        return car

    def _assert_can_manage(self, car: Car, current_user: User) -> None:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value):
            return
        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer or car.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to manage this car.")

    def get_owned_car(self, car_id: int, current_user: User) -> Car:
        """Fetch a car and assert the current user is allowed to view/manage it."""
        car = self.get_by_id(car_id)
        self._assert_can_manage(car, current_user)
        return car

    def list_cars(self, params: PaginationParams, current_user: User, customer_id: int | None = None):
        stmt = select(Car)
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            stmt = stmt.where(Car.customer_id == customer.id if customer else -1)
        elif customer_id:
            stmt = stmt.where(Car.customer_id == customer_id)

        items, total = self.car_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[Car.plate_number, Car.brand],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_car(self, car_id: int, payload: CarUpdate, current_user: User) -> Car:
        car = self.get_by_id(car_id)
        self._assert_can_manage(car, current_user)
        data = payload.model_dump(exclude_unset=True)
        return self.car_repo.update(car, data)

    def delete_car(self, car_id: int, current_user: User) -> None:
        car = self.get_by_id(car_id)
        self._assert_can_manage(car, current_user)
        self.car_repo.delete(car)
