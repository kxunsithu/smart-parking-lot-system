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
from app.core.exceptions import BadRequestException
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.models.wallet_account import WalletAccount
from app.services.wallet_payment_client import get_wallet_client

TEST_DATABASE_URL = "sqlite://"


class FakeWalletClient:
    """Stands in for the digital wallet external payment API during tests."""

    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail
        self.initiated = 0
        self.confirmed = 0
        self.completed_refs: set[str] = set()
        self.last_customer_phone: str | None = None
        self.last_api_key: str | None = None

    def initiate(
        self,
        customer_phone: str,
        amount: float,
        order_reference: str,
        description: str | None = None,
        redirect_url: str | None = None,
        api_key: str | None = None,
    ) -> dict:
        self.last_customer_phone = customer_phone
        self.last_api_key = api_key
        if self.should_fail:
            raise BadRequestException("Customer not found for the given phone number.")
        self.initiated += 1
        fee = round(float(amount) * 0.01, 2)
        reference = f"PAY-TEST-{self.initiated:010d}"
        return {
            "payment_reference": reference,
            "customer_phone": customer_phone,
            "merchant_name": "Smart Parking",
            "amount": float(amount),
            "fee": fee,
            "total": round(float(amount) + fee, 2),
            "order_reference": order_reference,
            "status": "pending",
            "expires_at": None,
            "payment_url": f"http://wallet.local/external-payments/pay/{reference}",
        }

    def confirm(self, payment_reference: str, otp_code: str, pin: str, api_key: str | None = None) -> dict:
        self.last_api_key = api_key
        if self.should_fail or otp_code != "123456":
            raise BadRequestException("Invalid OTP.")
        self.confirmed += 1
        self.completed_refs.add(payment_reference)
        return {
            "id": 5000 + self.confirmed,
            "transaction_number": "TX-TEST-123",
            "status": "completed",
        }

    def get_payment_status(self, payment_reference: str, api_key: str | None = None) -> dict:
        self.last_api_key = api_key
        if payment_reference in self.completed_refs:
            return {
                "reference": payment_reference,
                "order_reference": None,
                "status": "completed",
                "transaction_number": "TX-TEST-123",
            }
        return {
            "reference": payment_reference,
            "order_reference": None,
            "status": "pending",
            "transaction_number": None,
        }

    def resolve_api_key(self, api_key: str | None = None) -> dict:
        if self.should_fail or not api_key or api_key == "sk_invalid":
            raise BadRequestException("Invalid or inactive API key.")
        return {
            "name": "Smart Parking",
            "account_name": "Wallet Agent",
            "wallet_phone": "+959000000099",
            "system_link": "https://smart-parking.example",
        }

    def mark_completed(self, payment_reference: str) -> None:
        """Simulate the customer completing the payment on the wallet hosted page."""
        self.completed_refs.add(payment_reference)


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

    # A platform (admin) wallet account must exist before owners can pay subscriptions.
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    setup = TestingSessionLocal()
    try:
        if not setup.query(WalletAccount).filter(WalletAccount.owner_id.is_(None)).first():
            setup.add(WalletAccount(owner_id=None, name="Platform", api_key="sk_test_platform"))
            setup.commit()
    finally:
        setup.close()

    fake_wallet = FakeWalletClient()
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_wallet_client] = lambda: fake_wallet
    with TestClient(app) as test_client:
        test_client._fake_wallet = fake_wallet  # type: ignore[attr-defined]
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


def set_phone(client: TestClient, headers: dict, phone: str = "+959000000001") -> None:
    response = client.put("/api/v1/auth/me", json={"phone": phone}, headers=headers)
    assert response.status_code == 200


def purchase_and_activate(client: TestClient, owner_headers: dict, pkg_id: int, is_renewal: bool = False) -> dict:
    """Initiate wallet payment for package and confirm payment via the fake wallet."""
    set_phone(client, owner_headers)
    init = client.post(
        "/api/v1/subscriptions/pay/initiate",
        json={"package_id": pkg_id, "is_renewal": is_renewal},
        headers=owner_headers,
    )
    assert init.status_code == 201, init.text
    reference = init.json()["data"]["reference"]

    conf = client.post(
        "/api/v1/subscriptions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=owner_headers,
    )
    assert conf.status_code == 200, conf.text
    return conf.json()["data"]["subscription"]


def create_owner_wallet(
    client: TestClient,
    owner_headers: dict,
    api_key: str = "sk_test_owner",
    name: str = "Owner Wallet",
) -> dict:
    """Give the owner a receiving wallet account so customers can pay them."""
    resp = client.post(
        "/api/v1/wallet-accounts/me",
        json={"name": name, "api_key": api_key},
        headers=owner_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def book_and_pay_session(
    client: TestClient,
    customer_headers: dict,
    car_id: int,
    slot_id: int,
    owner_headers: dict,
    start_time: str,
    end_time: str,
) -> dict:
    """Book a session and complete wallet payment, returning the activated session dict."""
    create_owner_wallet(client, owner_headers)
    book = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={"car_id": car_id, "slot_id": slot_id, "start_time": start_time, "end_time": end_time},
    )
    assert book.status_code == 201, book.text
    session_id = book.json()["data"]["id"]

    set_phone(client, customer_headers)
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201, init.text

    conf = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200, conf.text
    return conf.json()["data"]["session"]
