"""Drop and recreate the database schema so migrations + seed run against a clean DB.

Usage (from the smart-parking-api directory):
    python -m scripts.reset_db
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.config.settings import settings
from app.database.session import engine


def reset_db() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        from app.database.base import Base

        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("SQLite database recreated.")
        return

    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    print("Public schema dropped and recreated.")


if __name__ == "__main__":
    reset_db()
