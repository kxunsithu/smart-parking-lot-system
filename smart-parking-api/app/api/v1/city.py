"""City CRUD, image upload, and list endpoints. Admin-only for write operations."""
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.constants import RoleName
from app.database.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.city import City
from app.models.user import User
from app.schemas.city import CityCreate, CityOut, CityUpdate
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/cities", tags=["Cities"])

CITY_IMAGE_DIR = Path("uploads/city_images")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


def _save_city_image(file: UploadFile) -> str:
    """Save an uploaded city image and return its URL path."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed: JPEG, PNG, WebP, GIF.",
        )
    CITY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    dest = CITY_IMAGE_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/city_images/{filename}"


def _delete_city_image(image_url: Optional[str]) -> None:
    """Delete a city image file from disk."""
    if not image_url:
        return
    path = Path(image_url.lstrip("/"))
    if path.exists():
        path.unlink(missing_ok=True)


# ── Public endpoints ─────────────────────────────────────────────────────────

@router.get("", response_model=SuccessResponse[list[CityOut]])
def list_cities(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    """List all cities (public). Optionally filter by is_active."""
    q = db.query(City)
    if is_active is not None:
        q = q.filter(City.is_active == is_active)
    cities = q.order_by(City.name).all()
    return {"success": True, "message": "Cities fetched.", "data": cities}


@router.get("/{city_id}", response_model=SuccessResponse[CityOut])
def get_city(city_id: int, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    return {"success": True, "message": "City fetched.", "data": city}


# ── Admin-only write endpoints ───────────────────────────────────────────────

@router.post("", response_model=SuccessResponse[CityOut], status_code=status.HTTP_201_CREATED)
def create_city(
    name: str = Form(...),
    name_mm: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    """Create a new city. Admin only."""
    if db.query(City).filter(City.name == name).first():
        raise HTTPException(status_code=400, detail=f"City '{name}' already exists.")

    image_url = _save_city_image(image) if image and image.filename else None
    city = City(name=name, name_mm=name_mm, description=description, is_active=is_active, image_url=image_url)
    db.add(city)
    db.commit()
    db.refresh(city)
    return {"success": True, "message": "City created.", "data": city}


@router.put("/{city_id}", response_model=SuccessResponse[CityOut])
def update_city(
    city_id: int,
    name: Optional[str] = Form(None),
    name_mm: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[str] = Form(None),   # Form booleans come as strings
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    """Update a city. Admin only. Upload a new image to replace the existing one."""
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    if name is not None:
        # check uniqueness
        existing = db.query(City).filter(City.name == name, City.id != city_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"City '{name}' already exists.")
        city.name = name
    if name_mm is not None:
        city.name_mm = name_mm
    if description is not None:
        city.description = description
    if is_active is not None:
        city.is_active = is_active.lower() in ("true", "1", "yes")

    if image and image.filename:
        _delete_city_image(city.image_url)
        city.image_url = _save_city_image(image)

    db.commit()
    db.refresh(city)
    return {"success": True, "message": "City updated.", "data": city}


@router.delete("/{city_id}/image", response_model=SuccessResponse[CityOut])
def delete_city_image(
    city_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    """Remove the image from a city. Admin only."""
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    _delete_city_image(city.image_url)
    city.image_url = None
    db.commit()
    db.refresh(city)
    return {"success": True, "message": "City image removed.", "data": city}


@router.delete("/{city_id}", response_model=SuccessResponse[None])
def delete_city(
    city_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.ADMIN)),
):
    """Delete a city. Admin only."""
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    _delete_city_image(city.image_url)
    db.delete(city)
    db.commit()
    return {"success": True, "message": "City deleted.", "data": None}
