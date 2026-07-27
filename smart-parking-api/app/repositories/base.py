"""Generic repository providing common CRUD + pagination/search/sort helpers."""
from typing import Any, Generic, List, Optional, Sequence, Type, TypeVar

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    model: Type[ModelType]

    def __init__(self, db: Session):
        self.db = db

    def get(self, id_: int) -> Optional[ModelType]:
        return self.db.get(self.model, id_)

    def get_by_id(self, id_: int) -> Optional[ModelType]:
        return self.get(id_)

    def get_all(self) -> List[ModelType]:
        return list(self.db.scalars(select(self.model)).all())

    def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelType, data: dict[str, Any]) -> ModelType:
        for key, value in data.items():
            if value is not None:
                setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelType) -> None:
        self.db.delete(obj)
        self.db.commit()

    def paginate(
        self,
        stmt: Select,
        page: int = 1,
        limit: int = 10,
        sort_by: Optional[str] = None,
        order: str = "asc",
        search: Optional[str] = None,
        search_fields: Optional[Sequence[Any]] = None,
    ) -> tuple[List[ModelType], int]:
        """Apply search, sorting and pagination to a select statement."""
        if search and search_fields:
            like_expr = f"%{search}%"
            stmt = stmt.where(or_(*[field.ilike(like_expr) for field in search_fields]))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.scalar(count_stmt) or 0

        if sort_by is not None and hasattr(self.model, sort_by):
            column = getattr(self.model, sort_by)
            stmt = stmt.order_by(column.desc() if order == "desc" else column.asc())

        stmt = stmt.offset((page - 1) * limit).limit(limit)
        items = list(self.db.scalars(stmt).all())
        return items, total
