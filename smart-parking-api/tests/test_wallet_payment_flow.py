"""Tests for the wallet-only payment flow (sessions + subscriptions)."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth_headers, purchase_and_activate, set_phone


def _setup_lot_with_slot(client, admin_headers, owner_headers):
    """Create package, subscribe owner, and build a lot/floor/slot. Returns slot_id + pkg_id."""
    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    purchase_and_activate(client, owner_headers, pkg_id)

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "Wallet Lot", "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "F1"}
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": "W-01"}
    ).json()["data"]["id"]
    return slot_id, pkg_id


def _register_customer(client, email="wallet.customer@test.com", phone="+959000000001", plate="WAL-123"):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Wallet Customer", "email": email, "password": "Customer@1234"},
    )
    headers = auth_headers(client, email, "Customer@1234")
    set_phone(client, headers, phone)
    car_id = client.post("/api/v1/cars", headers=headers, json={"plate_number": plate}).json()["data"]["id"]
    return headers, car_id


def _book_tomorrow(client, headers, car_id, slot_id):
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0, tzinfo=timezone.utc)
    resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=headers,
        json={
            "car_id": car_id,
            "slot_id": slot_id,
            "start_time": base.isoformat(),
            "end_time": (base + timedelta(hours=2)).isoformat(),
        },
    )
    assert resp.status_code == 201
    return resp.json()["data"]


def test_book_creates_pending_session_and_cannot_finish(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": "owner.wallet1@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    owner_headers = auth_headers(client, "owner.wallet1@test.com", "Owner@1234")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="wallet.cust1@test.com")
    session = _book_tomorrow(client, customer_headers, car_id, slot_id)

    assert session["status"] == "PENDING"
    assert session["fee"] > 0

    # A PENDING session cannot be finished (only ACTIVE can).
    finish = client.patch(
        f"/api/v1/parking-sessions/{session['id']}/finish",
        json={},
        headers=customer_headers,
    )
    assert finish.status_code == 400


def test_session_payment_full_flow(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": "owner.wallet2@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    owner_headers = auth_headers(client, "owner.wallet2@test.com", "Owner@1234")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="wallet.cust2@test.com")
    session = _book_tomorrow(client, customer_headers, car_id, slot_id)
    session_id = session["id"]

    # Initiate → OTP is returned and a pending payment is created
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201
    data = init.json()["data"]
    assert data["status"] == "PENDING"
    assert "otp_code" not in data
    assert data["amount"] == session["fee"]
    assert data["total"] == round(data["amount"] + data["fee"], 2)

    # Session is still PENDING before confirm
    assert client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]["status"] == "PENDING"

    # Confirm with correct OTP + PIN → session becomes ACTIVE
    conf = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["payment"]["status"] == "COMPLETED"
    assert conf.json()["data"]["session"]["status"] == "ACTIVE"

    # Re-initiating after payment is rejected
    reinit = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert reinit.status_code == 400


def test_session_payment_wrong_otp_then_retry(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": "owner.wallet3@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    owner_headers = auth_headers(client, "owner.wallet3@test.com", "Owner@1234")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="wallet.cust3@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201

    wrong = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "000000", "pin": "1234"},
        headers=customer_headers,
    )
    assert wrong.status_code == 400

    # Session remains PENDING after a failed attempt
    assert client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]["status"] == "PENDING"

    # Correct OTP still works
    ok = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["session"]["status"] == "ACTIVE"


def test_session_payment_requires_phone(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": "owner.wallet4@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    owner_headers = auth_headers(client, "owner.wallet4@test.com", "Owner@1234")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    # Customer WITHOUT a phone number
    client.post(
        "/api/v1/auth/register",
        json={"name": "No Phone", "email": "wallet.nophone@test.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "wallet.nophone@test.com", "Customer@1234")
    car_id = client.post("/api/v1/cars", headers=customer_headers, json={"plate_number": "WAL-456"}).json()["data"]["id"]

    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 400
    assert "phone number" in init.json()["message"].lower()


def test_other_customer_cannot_pay_for_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": "owner.wallet5@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    owner_headers = auth_headers(client, "owner.wallet5@test.com", "Owner@1234")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    owner_headers, car_id = _register_customer(client, email="wallet.cust5a@test.com", phone="+959111111111")
    session_id = _book_tomorrow(client, owner_headers, car_id, slot_id)["id"]

    other_headers, _ = _register_customer(client, email="wallet.cust5b@test.com", phone="+959222222222", plate="WAL-789")
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=other_headers)
    assert init.status_code == 403


def test_unpaid_subscription_blocks_lot_creation(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Pending Owner",
            "email": "owner.pending@test.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "PendingCo",
        },
    )
    owner_headers = auth_headers(client, "owner.pending@test.com", "Owner@1234")

    # Purchase but do NOT pay
    resp = client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)
    assert resp.status_code == 201
    assert resp.json()["data"]["status"] == "PENDING"

    # Cannot create a lot while subscription is unpaid
    lot = client.post("/api/v1/parking-lots", json={"name": "Lot Before Pay"}, headers=owner_headers)
    assert lot.status_code == 403

    # After paying, creation is allowed
    sub_id = resp.json()["data"]["id"]
    set_phone(client, owner_headers)
    init = client.post(f"/api/v1/subscriptions/{sub_id}/pay/initiate", headers=owner_headers)
    conf = client.post(
        f"/api/v1/subscriptions/{sub_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=owner_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["subscription"]["status"] == "ACTIVE"

    lot2 = client.post("/api/v1/parking-lots", json={"name": "Lot After Pay"}, headers=owner_headers)
    assert lot2.status_code == 201
