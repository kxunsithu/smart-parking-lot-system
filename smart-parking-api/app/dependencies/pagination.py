"""Shared query-parameter dependency for list endpoints."""
from typing import Optional

from fastapi import Query

from app.schemas.common import PaginationParams


def pagination_params(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    sort_by: Optional[str] = Query(default=None),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(default=None),
) -> PaginationParams:
    return PaginationParams(page=page, limit=limit, sort_by=sort_by, order=order, search=search)
