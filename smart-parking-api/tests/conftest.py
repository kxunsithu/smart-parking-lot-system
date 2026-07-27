"""Shared pytest fixtures: isolated in-memory SQLite DB + FastAPI TestClient."""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.constants import RoleName
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.role import Role
from app.models.user import User

TEST_DATABASE_URL = "sqlite://"


@pytest.fixture()
def db_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def seed_roles(db_session):
    roles = {}
    for role_name in RoleName:
        role = Role(name=role_name.value, description=role_name.value.title())
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)
        roles[role_name.value] = role
    return roles


@pytest.fixture()
def client(db_engine, db_session):
    def override_get_db():
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_user(db_session, seed_roles):
    user = User(
        name="Admin User",
        email="admin@test.com",
        password=hash_password("Admin@12345"),
        role_id=seed_roles[RoleName.ADMIN.value].id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(client: TestClient, email: str, password: str) -> dict:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
