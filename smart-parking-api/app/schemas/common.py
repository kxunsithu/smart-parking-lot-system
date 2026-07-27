"""Common response envelopes, pagination and query parameter schemas."""
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class Meta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success."
    data: Optional[T] = None
    meta: Optional[Meta] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str = "An error occurred."
    errors: Optional[List[ErrorDetail]] = None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number, starting from 1.")
    limit: int = Field(default=10, ge=1, le=100, description="Number of items per page.")
    sort_by: Optional[str] = Field(default=None, description="Field name to sort by.")
    order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order: asc or desc.")
    search: Optional[str] = Field(default=None, description="Free-text search keyword.")


def build_meta(total: int, page: int, limit: int) -> Meta:
    total_pages = (total + limit - 1) // limit if limit else 0
    return Meta(page=page, limit=limit, total=total, total_pages=total_pages)


def success_response(data: Any = None, message: str = "Success.", meta: Optional[Meta] = None) -> dict:
    return {"success": True, "message": message, "data": data, "meta": meta}
