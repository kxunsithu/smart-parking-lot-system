"""Vehicle management endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.vehicle import VehicleCreate, VehicleOut, VehicleUpdate
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.post("", response_model=SuccessResponse[VehicleOut], status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = VehicleService(db).create_vehicle(payload, current_user)
    return {"success": True, "message": "Vehicle registered successfully.", "data": vehicle}


@router.get("", response_model=SuccessResponse[list[VehicleOut]])
def list_vehicles(
    customer_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = VehicleService(db).list_vehicles(params, current_user, customer_id=customer_id)
    return {"success": True, "message": "Vehicles fetched successfully.", "data": items, "meta": meta}


@router.get("/{vehicle_id}", response_model=SuccessResponse[VehicleOut])
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = VehicleService(db).get_owned_vehicle(vehicle_id, current_user)
    return {"success": True, "message": "Vehicle fetched successfully.", "data": vehicle}


@router.put("/{vehicle_id}", response_model=SuccessResponse[VehicleOut])
def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = VehicleService(db).update_vehicle(vehicle_id, payload, current_user)
    return {"success": True, "message": "Vehicle updated successfully.", "data": vehicle}


@router.delete("/{vehicle_id}", response_model=SuccessResponse[None])
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    VehicleService(db).delete_vehicle(vehicle_id, current_user)
    return {"success": True, "message": "Vehicle deleted successfully.", "data": None}
