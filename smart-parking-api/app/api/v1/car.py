"""Car management endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.car import CarCreate, CarOut, CarUpdate
from app.schemas.common import PaginationParams, SuccessResponse
from app.services.car_service import CarService

router = APIRouter(prefix="/cars", tags=["Cars"])


@router.post("", response_model=SuccessResponse[CarOut], status_code=status.HTTP_201_CREATED)
def create_car(payload: CarCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    car = CarService(db).create_car(payload, current_user)
    return {"success": True, "message": "Car registered successfully.", "data": car}


@router.get("", response_model=SuccessResponse[list[CarOut]])
def list_cars(
    customer_id: Optional[int] = Query(default=None),
    params: PaginationParams = Depends(pagination_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, meta = CarService(db).list_cars(params, current_user, customer_id=customer_id)
    return {"success": True, "message": "Cars fetched successfully.", "data": items, "meta": meta}


@router.get("/{car_id}", response_model=SuccessResponse[CarOut])
def get_car(car_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    car = CarService(db).get_owned_car(car_id, current_user)
    return {"success": True, "message": "Car fetched successfully.", "data": car}


@router.put("/{car_id}", response_model=SuccessResponse[CarOut])
def update_car(
    car_id: int,
    payload: CarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    car = CarService(db).update_car(car_id, payload, current_user)
    return {"success": True, "message": "Car updated successfully.", "data": car}


@router.delete("/{car_id}", response_model=SuccessResponse[None])
def delete_car(car_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    CarService(db).delete_car(car_id, current_user)
    return {"success": True, "message": "Car deleted successfully.", "data": None}
