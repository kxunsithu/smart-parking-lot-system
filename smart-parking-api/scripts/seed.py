"""Seed script: creates default roles and a System Admin account.

Usage (from the smart-parking-api directory):
    python -m scripts.seed
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config.settings import settings
from app.core.constants import RoleName
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.role import Role
from app.models.user import User

DEFAULT_ROLES = [
    (RoleName.ADMIN.value, "System administrator"),
    (RoleName.OWNER.value, "Parking owner"),
    (RoleName.STAFF.value, "Parking staff"),
    (RoleName.CUSTOMER.value, "End customer"),
]


def seed() -> None:
    db = SessionLocal()
    try:
        role_map: dict[str, Role] = {}
        for name, description in DEFAULT_ROLES:
            role = db.query(Role).filter(Role.name == name).first()
            if not role:
                role = Role(name=name, description=description)
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"Created role: {name}")
            else:
                print(f"Role already exists: {name}")
            role_map[name] = role

        admin = db.query(User).filter(User.email == settings.DEFAULT_ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                name=settings.DEFAULT_ADMIN_NAME,
                email=settings.DEFAULT_ADMIN_EMAIL,
                password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                role_id=role_map[RoleName.ADMIN.value].id,
                created_by=None,
            )
            db.add(admin)
            db.commit()
            print(f"Created System Admin account: {settings.DEFAULT_ADMIN_EMAIL}")
            print(f"Default password: {settings.DEFAULT_ADMIN_PASSWORD}")
            print("IMPORTANT: Change this password after first login.")
        else:
            print(f"System Admin account already exists: {settings.DEFAULT_ADMIN_EMAIL}")

        print("Seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
