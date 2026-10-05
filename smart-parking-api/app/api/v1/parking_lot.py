"""Parking Lot CRUD, search, and filter endpoints."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName, Kayin_STATE_CITIES
from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.dependencies.auth import get_current_user, get_current_user_optional, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.parking_lot import ParkingLotCreate, ParkingLotOut, ParkingLotUpdate, ParkingLotWithStaffOut
from app.services.parking_lot_service import ParkingLotService
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/parking-lots", tags=["Parking Lots"])


@router.get("/cities", response_model=SuccessResponse[list[str]])
def list_Kayin_cities():
    """Return all Kayin State cities available for parking lot filtering."""
    return {"success": True, "message": "Kayin State cities fetched.", "data": Kayin_STATE_CITIES}


@router.post(
    "",
    response_model=SuccessResponse[ParkingLotOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def create_lot(payload: ParkingLotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = ParkingLotService(db).create_lot(payload, current_user)
    return {"success": True, "message": "Parking lot created successfully.", "data": lot}


@router.get("", response_model=SuccessResponse[list[ParkingLotOut]])
def list_lots(
    type: str | None = Query(default=None),
    owner_id: int | None = Query(default=None),
    city: str | None = Query(default=None, description="Filter by city in Kayin State"),
    is_active: bool | None = Query(default=None, description="Filter by lot active status"),
    only_active_subscription: bool | None = Query(default=None, description="Filter lots with active owner subscriptions"),
    with_staff_count: bool = Query(default=False),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Customer view (or public unauthenticated listing): only active lots & unexpired owner subscriptions
    if current_user is None or (current_user.role and current_user.role.name == RoleName.CUSTOMER.value):
        if is_active is None:
            is_active = True
        if only_active_subscription is None:
            only_active_subscription = True

    items, meta = ParkingLotService(db).list_lots(
        params,
        type_=type,
        owner_id=owner_id,
        city=city,
        is_active=is_active,
        only_active_subscription=bool(only_active_subscription),
        with_staff_count=with_staff_count,
    )
    return {"success": True, "message": "Parking lots fetched successfully.", "data": items, "meta": meta}


@router.get("/{lot_id}", response_model=SuccessResponse[ParkingLotOut])
def get_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    lot = ParkingLotService(db).get_by_id(lot_id)
    if current_user is None or (current_user.role and current_user.role.name == RoleName.CUSTOMER.value):
        if not lot.is_active:
            raise NotFoundException("Resource not found.")
        sub = SubscriptionService(db).get_active_subscription(lot.owner_id)
        if not sub:
            raise NotFoundException("Resource not found.")
    return {"success": True, "message": "Parking lot fetched successfully.", "data": lot}


@router.put(
    "/{lot_id}",
    response_model=SuccessResponse[ParkingLotOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def update_lot(
    lot_id: int,
    payload: ParkingLotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lot = ParkingLotService(db).update_lot(lot_id, payload, current_user)
    return {"success": True, "message": "Parking lot updated successfully.", "data": lot}


@router.delete(
    "/{lot_id}",
    response_model=SuccessResponse[None],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def delete_lot(lot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ParkingLotService(db).delete_lot(lot_id, current_user)
    return {"success": True, "message": "Parking lot deleted successfully.", "data": None}


@router.patch(
    "/{lot_id}/toggle-status",
    response_model=SuccessResponse[ParkingLotOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER))],
)
def toggle_lot_status(lot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lot = ParkingLotService(db).toggle_lot_status(lot_id, current_user)
    return {"success": True, "message": "Parking lot status toggled successfully.", "data": lot}
