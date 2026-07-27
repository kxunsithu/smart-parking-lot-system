"""Customer profile management endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.dependencies.pagination import pagination_params
from app.models.user import User
from app.schemas.common import PaginationParams, SuccessResponse
from app.schemas.customer import CustomerOut, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get(
    "",
    response_model=SuccessResponse[list[CustomerOut]],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER, RoleName.STAFF))],
)
def list_customers(params: PaginationParams = Depends(pagination_params), db: Session = Depends(get_db)):
    items, meta = CustomerService(db).list_customers(params)
    return {"success": True, "message": "Customers fetched successfully.", "data": items, "meta": meta}


@router.get("/me", response_model=SuccessResponse[CustomerOut], dependencies=[Depends(require_roles(RoleName.CUSTOMER))])
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = CustomerService(db).get_by_user_id(current_user.id)
    return {"success": True, "message": "Customer profile fetched successfully.", "data": customer}


@router.put("/me", response_model=SuccessResponse[CustomerOut], dependencies=[Depends(require_roles(RoleName.CUSTOMER))])
def update_my_profile(
    payload: CustomerUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    service = CustomerService(db)
    customer = service.get_by_user_id(current_user.id)
    updated = service.update_customer(customer.id, payload)
    return {"success": True, "message": "Customer profile updated successfully.", "data": updated}


@router.get(
    "/{customer_id}",
    response_model=SuccessResponse[CustomerOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.OWNER, RoleName.STAFF))],
)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = CustomerService(db).get_by_id(customer_id)
    return {"success": True, "message": "Customer fetched successfully.", "data": customer}
