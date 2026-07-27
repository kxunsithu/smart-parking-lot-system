"""Business logic for Vehicles."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.user import User
from app.models.vehicle import Vehicle
from app.repositories.customer_repository import CustomerRepository
from app.repositories.vehicle_repository import VehicleRepository
from app.schemas.common import PaginationParams, build_meta
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleService:
    def __init__(self, db: Session):
        self.db = db
        self.vehicle_repo = VehicleRepository(db)
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
            raise ForbiddenException("Only Customers can register vehicles.")
        return customer.id

    def create_vehicle(self, payload: VehicleCreate, current_user: User) -> Vehicle:
        if self.vehicle_repo.get_by_plate_number(payload.plate_number):
            raise ConflictException(
                "Validation failed.",
                errors=[{"field": "plate_number", "message": "Plate number already exists."}],
            )

        customer_id = self._resolve_customer_id(current_user, payload.customer_id)
        vehicle = Vehicle(
            customer_id=customer_id,
            plate_number=payload.plate_number,
            vehicle_type=payload.vehicle_type,
            brand=payload.brand,
            color=payload.color,
        )
        return self.vehicle_repo.create(vehicle)

    def get_by_id(self, vehicle_id: int) -> Vehicle:
        vehicle = self.vehicle_repo.get(vehicle_id)
        if not vehicle:
            raise NotFoundException("Resource not found.")
        return vehicle

    def _assert_can_manage(self, vehicle: Vehicle, current_user: User) -> None:
        if current_user.role.name in (RoleName.ADMIN.value, RoleName.STAFF.value):
            return
        customer = self.customer_repo.get_by_user_id(current_user.id)
        if not customer or vehicle.customer_id != customer.id:
            raise ForbiddenException("You do not have permission to manage this vehicle.")

    def get_owned_vehicle(self, vehicle_id: int, current_user: User) -> Vehicle:
        """Fetch a vehicle and assert the current user is allowed to view/manage it."""
        vehicle = self.get_by_id(vehicle_id)
        self._assert_can_manage(vehicle, current_user)
        return vehicle

    def list_vehicles(self, params: PaginationParams, current_user: User, customer_id: int | None = None):
        stmt = select(Vehicle)
        if current_user.role.name == RoleName.CUSTOMER.value:
            customer = self.customer_repo.get_by_user_id(current_user.id)
            stmt = stmt.where(Vehicle.customer_id == customer.id if customer else -1)
        elif customer_id:
            stmt = stmt.where(Vehicle.customer_id == customer_id)

        items, total = self.vehicle_repo.paginate(
            stmt,
            page=params.page,
            limit=params.limit,
            sort_by=params.sort_by,
            order=params.order,
            search=params.search,
            search_fields=[Vehicle.plate_number, Vehicle.brand],
        )
        return items, build_meta(total, params.page, params.limit)

    def update_vehicle(self, vehicle_id: int, payload: VehicleUpdate, current_user: User) -> Vehicle:
        vehicle = self.get_by_id(vehicle_id)
        self._assert_can_manage(vehicle, current_user)
        data = payload.model_dump(exclude_unset=True)
        return self.vehicle_repo.update(vehicle, data)

    def delete_vehicle(self, vehicle_id: int, current_user: User) -> None:
        vehicle = self.get_by_id(vehicle_id)
        self._assert_can_manage(vehicle, current_user)
        self.vehicle_repo.delete(vehicle)
