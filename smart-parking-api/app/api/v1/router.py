"""Aggregates all v1 API routers under a single APIRouter."""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    customer,
    dashboard,
    package,
    parking_floor,
    parking_lot,
    parking_owner,
    parking_session,
    parking_slot,
    parking_staff,
    subscription,
    users,
    car,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(parking_owner.router)
api_router.include_router(parking_staff.router)
api_router.include_router(customer.router)
api_router.include_router(car.router)
api_router.include_router(parking_lot.router)
api_router.include_router(parking_floor.router)
api_router.include_router(parking_slot.router)
api_router.include_router(parking_session.router)
api_router.include_router(dashboard.router)
api_router.include_router(package.router)
api_router.include_router(subscription.router)
