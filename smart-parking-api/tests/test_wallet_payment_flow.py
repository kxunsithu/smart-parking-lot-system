"""Tests for the digital wallet payment flow (sessions + subscriptions) and wallet accounts."""
from datetime import datetime, timedelta, timezone

from tests.conftest import (
    auth_headers,
    create_owner_wallet,
    purchase_and_activate,
    set_phone,
)


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


def _register_owner(client, email, name="Owner", company="WalletCo"):
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": name,
            "email": email,
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": company,
        },
    )
    return auth_headers(client, email, "Owner@1234")


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
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


# ─── Wallet account management ───────────────────────────────────────────────


def test_owner_can_manage_own_wallet_account(client, admin_user):
    owner_headers = _register_owner(client, "owner.account@test.com")

    # No account yet
    missing = client.get("/api/v1/wallet-accounts/me", headers=owner_headers)
    assert missing.status_code == 404

    # Create
    created = client.post(
        "/api/v1/wallet-accounts/me",
        json={"name": "My Receiving Wallet", "wallet_phone": "+959000000111", "api_key": "sk_live_owner_1"},
        headers=owner_headers,
    )
    assert created.status_code == 201
    assert created.json()["data"]["api_key"] == "sk_live_owner_1"
    account_id = created.json()["data"]["id"]

    # Duplicate create is rejected
    dup = client.post(
        "/api/v1/wallet-accounts/me",
        json={"name": "Again", "api_key": "sk_live_owner_2"},
        headers=owner_headers,
    )
    assert dup.status_code == 409

    # Get
    fetched = client.get("/api/v1/wallet-accounts/me", headers=owner_headers)
    assert fetched.status_code == 200
    assert fetched.json()["data"]["id"] == account_id

    # Update
    updated = client.put(
        "/api/v1/wallet-accounts/me",
        json={"name": "Renamed", "is_active": False},
        headers=owner_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "Renamed"
    assert updated.json()["data"]["is_active"] is False

    # Delete
    deleted = client.delete("/api/v1/wallet-accounts/me", headers=owner_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/wallet-accounts/me", headers=owner_headers).status_code == 404


def test_admin_can_manage_platform_and_list_accounts(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Platform account is pre-seeded by the test fixture.
    fetched = client.get("/api/v1/wallet-accounts/platform", headers=admin_headers)
    assert fetched.status_code == 200
    assert fetched.json()["data"]["owner_id"] is None

    # Duplicate platform create is rejected
    dup = client.post(
        "/api/v1/wallet-accounts/platform",
        json={"name": "Second", "api_key": "sk_platform_2"},
        headers=admin_headers,
    )
    assert dup.status_code == 409

    # Update
    updated = client.put(
        "/api/v1/wallet-accounts/platform",
        json={"name": "Platform Wallet", "api_key": "sk_live_platform"},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["api_key"] == "sk_live_platform"

    # An owner account is listed too (masked key, owner info included)
    owner_headers = _register_owner(client, "owner.list@test.com")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_list")
    listed = client.get("/api/v1/wallet-accounts", headers=admin_headers)
    assert listed.status_code == 200
    accounts = listed.json()["data"]
    assert len(accounts) == 2
    owner_account = next(a for a in accounts if a["owner_id"] is not None)
    assert owner_account["owner"]["email"] == "owner.list@test.com"
    assert owner_account["api_key"] is None
    assert owner_account["api_key_masked"] is not None

    # Non-admin cannot manage
    denied = client.get("/api/v1/wallet-accounts", headers=owner_headers)
    assert denied.status_code == 403


# ─── Session payments (customer → owner wallet) ──────────────────────────────


def test_session_payment_requires_owner_wallet_account(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.norecv@test.com")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.norecv@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]

    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 400
    assert "payment account" in init.json()["message"].lower()


def test_session_payment_full_flow(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.session@test.com")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_session")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.session@test.com")
    session = _book_tomorrow(client, customer_headers, car_id, slot_id)
    session_id = session["id"]

    assert session["status"] == "PENDING"
    assert session["fee"] > 0

    # A PENDING session cannot be finished.
    finish = client.patch(f"/api/v1/parking-sessions/{session_id}/finish", json={}, headers=customer_headers)
    assert finish.status_code == 400

    # Initiate → pending payment created using the owner's API key.
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201, init.text
    data = init.json()["data"]
    assert data["status"] == "PENDING"
    assert "otp_code" not in data
    assert data["amount"] == session["fee"]
    assert data["total"] == round(data["amount"] + data["fee"], 2)
    assert client._fake_wallet.last_api_key == "sk_owner_session"

    # Session is still PENDING before confirm.
    assert client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]["status"] == "PENDING"

    # Confirm with correct OTP + PIN → session becomes ACTIVE.
    conf = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["payment"]["status"] == "COMPLETED"
    assert conf.json()["data"]["session"]["status"] == "ACTIVE"

    # Re-initiating after payment is rejected.
    reinit = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert reinit.status_code == 400


def test_session_payment_wrong_otp_then_retry(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.otp@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.otp@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201

    wrong = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "000000", "pin": "1234"},
        headers=customer_headers,
    )
    assert wrong.status_code == 400

    # Session remains PENDING after a failed attempt.
    assert client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]["status"] == "PENDING"

    # Correct OTP still works.
    ok = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["session"]["status"] == "ACTIVE"


def test_session_payment_requires_phone(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.nophone@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    # Customer WITHOUT a phone number.
    client.post(
        "/api/v1/auth/register",
        json={"name": "No Phone", "email": "cust.nophone@test.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "cust.nophone@test.com", "Customer@1234")
    car_id = client.post("/api/v1/cars", headers=customer_headers, json={"plate_number": "WAL-456"}).json()["data"]["id"]

    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 400
    assert "phone number" in init.json()["message"].lower()

    # Passing wallet_phone in the body works even without a profile phone.
    ok = client.post(
        f"/api/v1/parking-sessions/{session_id}/pay/initiate",
        json={"wallet_phone": "+959111222333"},
        headers=customer_headers,
    )
    assert ok.status_code == 201


def test_other_customer_cannot_pay_for_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.other@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    owner_customer_headers, car_id = _register_customer(
        client, email="cust.other1@test.com", phone="+959111111111"
    )
    session_id = _book_tomorrow(client, owner_customer_headers, car_id, slot_id)["id"]

    other_headers, _ = _register_customer(
        client, email="cust.other2@test.com", phone="+959222222222", plate="WAL-789"
    )
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=other_headers)
    assert init.status_code == 403


# ─── Subscription payments (owner → platform wallet) ─────────────────────────


def test_subscription_payment_requires_platform_account(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    owner_headers = _register_owner(client, "owner.noplat@test.com")

    # Remove the platform account (pre-seeded by fixture).
    assert client.delete("/api/v1/wallet-accounts/platform", headers=admin_headers).status_code == 204

    sub_resp = client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)
    assert sub_resp.status_code == 201
    sub_id = sub_resp.json()["data"]["id"]

    init = client.post(f"/api/v1/subscriptions/{sub_id}/pay/initiate", headers=owner_headers)
    assert init.status_code == 400
    assert "platform administrator" in init.json()["message"].lower()


def test_owner_can_pay_subscription_with_wallet_phone(client, admin_user):
    """Owners can pass wallet_phone in the initiate body instead of relying on profile phone."""
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]
    owner_headers = _register_owner(client, "owner.wphone@test.com", name="Wallet Phone Owner")

    # Purchase without setting profile phone.
    resp = client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)
    assert resp.status_code == 201
    sub_id = resp.json()["data"]["id"]

    # Initiate with wallet_phone in the body.
    init = client.post(
        f"/api/v1/subscriptions/{sub_id}/pay/initiate",
        json={"wallet_phone": "+959000000099"},
        headers=owner_headers,
    )
    assert init.status_code == 201
    assert init.json()["data"]["status"] == "PENDING"

    conf = client.post(
        f"/api/v1/subscriptions/{sub_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=owner_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["subscription"]["status"] == "ACTIVE"


def test_unpaid_subscription_blocks_lot_creation(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    owner_headers = _register_owner(client, "owner.pending@test.com", name="Pending Owner")

    resp = client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)
    assert resp.status_code == 201
    assert resp.json()["data"]["status"] == "PENDING"

    # Cannot create a lot while the subscription is unpaid.
    lot = client.post("/api/v1/parking-lots", json={"name": "Lot Before Pay"}, headers=owner_headers)
    assert lot.status_code == 403

    # After paying, creation is allowed.
    sub_id = resp.json()["data"]["id"]
    set_phone(client, owner_headers)
    init = client.post(f"/api/v1/subscriptions/{sub_id}/pay/initiate", headers=owner_headers)
    assert init.status_code == 201, init.text
    conf = client.post(
        f"/api/v1/subscriptions/{sub_id}/pay/confirm",
        json={"otp_code": "123456", "pin": "1234"},
        headers=owner_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["subscription"]["status"] == "ACTIVE"

    lot2 = client.post("/api/v1/parking-lots", json={"name": "Lot After Pay"}, headers=owner_headers)
    assert lot2.status_code == 201
