"""Tests ensuring owners and staff only see sessions from their own parking lots."""
from tests.conftest import auth_headers, create_owner_wallet, purchase_and_activate
from tests.test_wallet_payment_flow import _book_tomorrow


def _register_customer(client, email, phone, plate):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Customer", "email": email, "password": "Customer@1234", "phone": phone},
    )
    assert resp.status_code == 201, resp.text
    headers = auth_headers(client, email, "Customer@1234")
    car_id = client.post("/api/v1/cars", headers=headers, json={"plate_number": plate}).json()["data"]["id"]
    return headers, car_id


def _register_owner(client, email, phone):
    resp = client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": email,
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Scoped Co",
            "phone": phone,
        },
    )
    assert resp.status_code == 201, resp.text
    return auth_headers(client, email, "Owner@1234")


def _create_lot_with_slot(client, owner_headers, name, slot_number):
    """Create a lot/floor/slot for an owner and return (lot_id, slot_id)."""
    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": name, "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "F1"}
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": slot_number}
    ).json()["data"]["id"]
    return lot_id, slot_id


def _create_staff(client, owner_headers, lot_id, email):
    resp = client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={"name": "Staff", "email": email, "password": "Staff@1234", "parking_lot_id": lot_id},
    )
    assert resp.status_code == 201, resp.text
    return auth_headers(client, email, "Staff@1234")


def _pay_session(client, customer_headers, car_id, slot_id) -> int:
    """Book + confirm a session, returning the created session id."""
    init = _book_tomorrow(client, customer_headers, car_id, slot_id)
    assert init.status_code == 201, init.text
    reference = init.json()["data"]["reference"]
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200, conf.text
    return conf.json()["data"]["session"]["id"]


def test_owner_and_staff_see_only_their_own_sessions(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]

    # Owner A: lot A + slot A + staff A
    owner_a_headers = _register_owner(client, "scoped.owner.a@test.com", "+959000000031")
    purchase_and_activate(client, owner_a_headers, pkg_id)
    create_owner_wallet(client, owner_a_headers, api_key="sk_owner_a")
    lot_a_id, slot_a = _create_lot_with_slot(client, owner_a_headers, "Scoped Lot A", "A-01")
    staff_a_headers = _create_staff(client, owner_a_headers, lot_a_id, "scoped.staff.a@test.com")

    # Owner B: lot B + slot B
    owner_b_headers = _register_owner(client, "scoped.owner.b@test.com", "+959000000032")
    purchase_and_activate(client, owner_b_headers, pkg_id)
    create_owner_wallet(client, owner_b_headers, api_key="sk_owner_b")
    _, slot_b = _create_lot_with_slot(client, owner_b_headers, "Scoped Lot B", "B-01")

    # Customer books on both lots
    cust_a_headers, car_a = _register_customer(
        client, email="scoped.cust.a@test.com", phone="+959000000041", plate="SCP-AAA"
    )
    cust_b_headers, car_b = _register_customer(
        client, email="scoped.cust.b@test.com", phone="+959000000042", plate="SCP-BBB"
    )
    session_a = _pay_session(client, cust_a_headers, car_a, slot_a)
    session_b = _pay_session(client, cust_b_headers, car_b, slot_b)

    owner_a_sessions = client.get("/api/v1/parking-sessions", headers=owner_a_headers).json()["data"]
    assert len(owner_a_sessions) == 1
    assert owner_a_sessions[0]["slot_id"] == slot_a

    owner_b_sessions = client.get("/api/v1/parking-sessions", headers=owner_b_headers).json()["data"]
    assert len(owner_b_sessions) == 1
    assert owner_b_sessions[0]["slot_id"] == slot_b

    staff_a_sessions = client.get("/api/v1/parking-sessions", headers=staff_a_headers).json()["data"]
    assert len(staff_a_sessions) == 1
    assert staff_a_sessions[0]["slot_id"] == slot_a

    cust_a_sessions = client.get("/api/v1/parking-sessions", headers=cust_a_headers).json()["data"]
    assert len(cust_a_sessions) == 1
    assert cust_a_sessions[0]["car_id"] == car_a

    # Admin can still see every session
    admin_sessions = client.get("/api/v1/parking-sessions", headers=admin_headers).json()["data"]
    assert len(admin_sessions) == 2

    # ─── Single-session access control ────────────────────────────────────────
    # Everyone can fetch the session they are entitled to see…
    assert client.get(f"/api/v1/parking-sessions/{session_a}", headers=owner_a_headers).status_code == 200
    assert client.get(f"/api/v1/parking-sessions/{session_a}", headers=staff_a_headers).status_code == 200
    assert client.get(f"/api/v1/parking-sessions/{session_a}", headers=cust_a_headers).status_code == 200
    assert client.get(f"/api/v1/parking-sessions/{session_b}", headers=admin_headers).status_code == 200
    # …but NOT another lot's/owner's session
    assert client.get(f"/api/v1/parking-sessions/{session_b}", headers=owner_a_headers).status_code == 403
    assert client.get(f"/api/v1/parking-sessions/{session_b}", headers=staff_a_headers).status_code == 403
    assert client.get(f"/api/v1/parking-sessions/{session_b}", headers=cust_a_headers).status_code == 403
    assert client.get(f"/api/v1/parking-sessions/{session_a}", headers=owner_b_headers).status_code == 403

    # ─── Finish access control ─────────────────────────────────────────────────
    # Owner/staff/customer cannot finish another owner's/lot's/session's booking.
    assert client.patch(f"/api/v1/parking-sessions/{session_b}/finish", json={}, headers=owner_a_headers).status_code == 403
    assert client.patch(f"/api/v1/parking-sessions/{session_b}/finish", json={}, headers=staff_a_headers).status_code == 403
    assert client.patch(f"/api/v1/parking-sessions/{session_b}/finish", json={}, headers=cust_a_headers).status_code == 403
    # But the rightful owner can finish their own session.
    assert client.patch(f"/api/v1/parking-sessions/{session_b}/finish", json={}, headers=cust_b_headers).status_code == 200