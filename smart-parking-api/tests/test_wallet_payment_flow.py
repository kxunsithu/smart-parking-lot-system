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


def _book_tomorrow(client, headers, car_id, slot_id, wallet_phone=None):
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0, tzinfo=timezone.utc)
    body = {
        "car_id": car_id,
        "slot_id": slot_id,
        "start_time": base.isoformat(),
        "end_time": (base + timedelta(hours=2)).isoformat(),
    }
    if wallet_phone:
        body["wallet_phone"] = wallet_phone
    return client.post(
        "/api/v1/parking-sessions/book",
        headers=headers,
        json=body,
    )


# ─── Session payments (customer → owner wallet) ──────────────────────────────


def test_session_payment_requires_owner_wallet_account(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.norecv@test.com")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.norecv@test.com")
    init = _book_tomorrow(client, customer_headers, car_id, slot_id)
    assert init.status_code == 400
    assert "payment account" in init.json()["message"].lower()


def test_session_payment_full_flow(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.session@test.com")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_session")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.session@test.com")
    init_resp = _book_tomorrow(client, customer_headers, car_id, slot_id)
    assert init_resp.status_code == 201, init_resp.text
    data = init_resp.json()["data"]
    assert data["status"] == "PENDING"
    assert "otp_code" not in data
    assert data["amount"] > 0
    assert data["total"] == round(data["amount"] + data["fee"], 2)
    assert client._fake_wallet.last_api_key == "sk_owner_session"
    reference = data["reference"]

    # Confirm with correct OTP + PIN → session is created and becomes ACTIVE.
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["payment"]["status"] == "COMPLETED"
    assert conf.json()["data"]["session"]["status"] == "ACTIVE"


def test_session_payment_wrong_otp_then_retry(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.otp@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.otp@test.com")
    init = _book_tomorrow(client, customer_headers, car_id, slot_id)
    assert init.status_code == 201
    reference = init.json()["data"]["reference"]

    wrong = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "000000", "pin": "1234"},
        headers=customer_headers,
    )
    assert wrong.status_code == 400

    # Correct OTP still works on retry.
    ok = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
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

    init = _book_tomorrow(client, customer_headers, car_id, slot_id)
    assert init.status_code == 400
    assert "phone number" in init.json()["message"].lower()

    # Passing wallet_phone in the body works even without a profile phone.
    ok = _book_tomorrow(client, customer_headers, car_id, slot_id, wallet_phone="+959111222333")
    assert ok.status_code == 201


def test_other_customer_cannot_pay_for_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.other@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    owner_customer_headers, car_id = _register_customer(
        client, email="cust.other1@test.com", phone="+959111111111"
    )
    init = _book_tomorrow(client, owner_customer_headers, car_id, slot_id)
    reference = init.json()["data"]["reference"]

    other_headers, _ = _register_customer(
        client, email="cust.other2@test.com", phone="+959222222222", plate="WAL-789"
    )
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=other_headers,
    )
    assert conf.status_code == 403


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
    set_phone(client, owner_headers)

    # Remove the platform account (pre-seeded by fixture).
    assert client.delete("/api/v1/wallet-accounts/platform", headers=admin_headers).status_code == 204

    init = client.post(
        "/api/v1/subscriptions/pay/initiate",
        json={"package_id": pkg_id},
        headers=owner_headers,
    )
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

    # Initiate with wallet_phone in the body.
    init = client.post(
        "/api/v1/subscriptions/pay/initiate",
        json={"package_id": pkg_id, "wallet_phone": "+959000000099"},
        headers=owner_headers,
    )
    assert init.status_code == 201
    pending = init.json()["data"]
    ref = pending["reference"]

    conf = client.post(
        "/api/v1/subscriptions/pay/confirm",
        json={"reference": ref, "otp_code": "123456", "pin": "1234"},
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

    # Cannot create a lot while the subscription is unpaid.
    lot = client.post("/api/v1/parking-lots", json={"name": "Lot Before Pay"}, headers=owner_headers)
    assert lot.status_code == 403

    # After paying, creation is allowed.
    set_phone(client, owner_headers)
    init = client.post(
        "/api/v1/subscriptions/pay/initiate",
        json={"package_id": pkg_id},
        headers=owner_headers,
    )
    assert init.status_code == 201, init.text
    ref = init.json()["data"]["reference"]

    conf = client.post(
        "/api/v1/subscriptions/pay/confirm",
        json={"reference": ref, "otp_code": "123456", "pin": "1234"},
        headers=owner_headers,
    )
    assert conf.status_code == 200
    assert conf.json()["data"]["subscription"]["status"] == "ACTIVE"

    lot2 = client.post("/api/v1/parking-lots", json={"name": "Lot After Pay"}, headers=owner_headers)
    assert lot2.status_code == 201
