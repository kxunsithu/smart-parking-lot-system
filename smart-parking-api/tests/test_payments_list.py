"""Tests for the wallet transaction list endpoint (GET /api/v1/payments)."""
from datetime import datetime, timedelta, timezone

from tests.conftest import (
    auth_headers,
    create_owner_wallet,
    purchase_and_activate,
    set_phone,
)


def _setup_lot_with_slot(client, admin_headers, owner_headers):
    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    purchase_and_activate(client, owner_headers, pkg_id)

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "List Lot", "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "F1"}
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": "L-01"}
    ).json()["data"]["id"]
    return slot_id, pkg_id, lot_id


def _register_owner(client, email, name="Owner"):
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": name,
            "email": email,
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "WalletCo",
        },
    )
    return auth_headers(client, email, "Owner@1234")


def _register_customer(client, email, phone, plate):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Wallet Customer", "email": email, "password": "Customer@1234"},
    )
    headers = auth_headers(client, email, "Customer@1234")
    set_phone(client, headers, phone)
    car_id = client.post("/api/v1/cars", headers=headers, json={"plate_number": plate}).json()["data"]["id"]
    return headers, car_id


def _paid_session(client, admin_headers, owner_headers, customer_email, plate):
    """Create an owner wallet + lot, book and fully pay a session. Returns (customer_headers, session)."""
    resp = client.post(
        "/api/v1/wallet-accounts/me",
        json={"name": "Owner Wallet", "api_key": f"sk_{plate.lower().replace('-', '')}"},
        headers=owner_headers,
    )
    assert resp.status_code in (201, 409), resp.text
    slot_id, _, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)
    customer_headers, car_id = _register_customer(
        client, email=customer_email, phone="+959111222333", plate=plate
    )
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, tzinfo=timezone.utc)
    init = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_id,
            "start_time": base.isoformat(),
            "end_time": (base + timedelta(hours=2)).isoformat(),
        },
    )
    assert init.status_code == 201, init.text
    reference = init.json()["data"]["reference"]
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200, conf.text
    return customer_headers, conf.json()["data"]["session"]


# ─── Access control ───────────────────────────────────────────────────────────


def test_customer_can_list_own_payments(client, admin_user):
    """Customers can list their own session payments (not 403 any more)."""
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.acl@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _, lot_id = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(
        client, email="cust.acl@test.com", phone="+959111222333", plate="ACL-001"
    )
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0, tzinfo=timezone.utc)
    init = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_id,
            "start_time": base.isoformat(),
            "end_time": (base + timedelta(hours=1)).isoformat(),
        },
    )
    assert init.status_code == 201, init.text
    reference = init.json()["data"]["reference"]
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200, conf.text
    session_id = conf.json()["data"]["session"]["id"]

    # Customer can now access their own payments (200).
    resp = client.get("/api/v1/payments", headers=customer_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["meta"]["total"] == 1
    row = data["data"][0]
    assert row["kind"] == "session"
    assert row["plate_number"] == "ACL-001"
    assert row["payer_name"] == "Wallet Customer"
    assert row["payer_phone"] == "+959111222333"
    assert row["session_id"] == session_id
    assert row["status"] == "COMPLETED"

    # Unauthenticated still gets 401.
    unauth = client.get("/api/v1/payments")
    assert unauth.status_code == 401


def test_staff_cannot_list_payments(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.staff@test.com")
    create_owner_wallet(client, owner_headers)
    _, _, lot_id = _setup_lot_with_slot(client, admin_headers, owner_headers)

    staff_email = "staff.list@test.com"
    client.post(
        "/api/v1/parking-staff",
        json={"name": "Staff", "email": staff_email, "password": "Staff@1234", "parking_lot_id": lot_id},
        headers=owner_headers,
    )
    staff_headers = auth_headers(client, staff_email, "Staff@1234")
    denied = client.get("/api/v1/payments", headers=staff_headers)
    assert denied.status_code == 403


# ─── Admin sees everything, owner sees own scope ──────────────────────────────


def test_admin_lists_all_payments_and_owner_sees_own_scope(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Owner A: subscription payment + one received session fee.
    owner_a_headers = _register_owner(client, "owner.alpha@test.com", name="Alpha Owner")
    _, session_a = _paid_session(
        client, admin_headers, owner_a_headers, "cust.alpha@test.com", "ALP-001"
    )

    # Owner B: one received session fee (must stay invisible to owner A).
    owner_b_headers = _register_owner(client, "owner.beta@test.com", name="Beta Owner")
    _, session_b = _paid_session(
        client, admin_headers, owner_b_headers, "cust.beta@test.com", "BET-001"
    )

    # Admin: sees every payment (2 sessions + 2 subscriptions = 4).
    admin_list = client.get("/api/v1/payments", headers=admin_headers)
    assert admin_list.status_code == 200, admin_list.text
    admin_data = admin_list.json()
    assert admin_data["meta"]["total"] == 4
    assert len(admin_data["data"]) == 4

    kinds = sorted(p["kind"] for p in admin_data["data"])
    assert kinds == ["session", "session", "subscription", "subscription"]

    session_row = next(p for p in admin_data["data"] if p["kind"] == "session" and p["plate_number"] == "ALP-001")
    assert session_row["lot_name"] == "List Lot"
    assert session_row["payer_name"] == "Wallet Customer"
    assert session_row["receiver_phone"] is not None
    assert session_row["direction"] is None  # direction is owner-only
    assert session_row["reference"].startswith("PP-")
    assert session_row["wallet_transaction_number"] is not None
    assert session_row["status"] == "COMPLETED"
    assert session_row["total"] == round(session_row["amount"] + session_row["fee"], 2)

    alpha_sub = next(
        p for p in admin_data["data"]
        if p["kind"] == "subscription" and p["owner_name"] == "Alpha Owner"
    )
    assert alpha_sub["package_name"] == "Basic"
    assert alpha_sub["plate_number"] is None

    # Owner A: only its own subscription + its own session; direction set.
    owner_a_list = client.get("/api/v1/payments", headers=owner_a_headers)
    assert owner_a_list.status_code == 200
    owner_a_data = owner_a_list.json()
    assert owner_a_data["meta"]["total"] == 2
    assert len(owner_a_data["data"]) == 2

    kinds_a = {p["kind"] for p in owner_a_data["data"]}
    assert kinds_a == {"session", "subscription"}

    paid_row = next(p for p in owner_a_data["data"] if p["kind"] == "subscription")
    assert paid_row["direction"] == "paid"
    assert paid_row["owner_name"] == "Alpha Owner"

    received_row = next(p for p in owner_a_data["data"] if p["kind"] == "session")
    assert received_row["direction"] == "received"
    assert received_row["plate_number"] == "ALP-001"

    # Owner B: only its own session fee + its own subscription (no Alpha rows).
    owner_b_list = client.get("/api/v1/payments", headers=owner_b_headers)
    assert owner_b_list.status_code == 200
    owner_b_data = owner_b_list.json()
    assert owner_b_data["meta"]["total"] == 2
    assert "ALP-001" not in [p["plate_number"] for p in owner_b_data["data"]]
    bet_row = next(p for p in owner_b_data["data"] if p["kind"] == "session")
    assert bet_row["plate_number"] == "BET-001"
    assert bet_row["direction"] == "received"
    assert session_a["status"] == "ACTIVE" and session_b["status"] == "ACTIVE"


# ─── Pagination + search ──────────────────────────────────────────────────────


def test_payments_list_pagination_and_search(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.pag@test.com", name="Pagination Owner")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_pag")

    # One subscription payment + three paid sessions on three slots = 4 rows total.
    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    purchase_and_activate(client, owner_headers, pkg_id)

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "Page Lot", "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "F1"}
    ).json()["data"]["id"]
    slot_ids = [
        client.post(
            "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": f"P-0{i}"}
        ).json()["data"]["id"]
        for i in range(3)
    ]

    for i, slot_id in enumerate(slot_ids):
        customer_headers, car_id = _register_customer(
            client, email=f"cust.pag{i}@test.com", phone="+959111222333", plate=f"PAG-00{i}"
        )
        tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
        base = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10 + i, 0, tzinfo=timezone.utc)
        init = client.post(
            "/api/v1/parking-sessions/book",
            headers=customer_headers,
            json={
                "car_id": car_id,
                "slot_id": slot_id,
                "start_time": base.isoformat(),
                "end_time": (base + timedelta(hours=2)).isoformat(),
            },
        )
        assert init.status_code == 201, init.text
        reference = init.json()["data"]["reference"]
        conf = client.post(
            "/api/v1/parking-sessions/pay/confirm",
            json={"reference": reference, "otp_code": "123456", "pin": "1234"},
            headers=customer_headers,
        )
        assert conf.status_code == 200, conf.text

    # 3 session fees + 1 subscription = 4 total.
    page1 = client.get("/api/v1/payments?page=1&limit=2", headers=admin_headers)
    assert page1.status_code == 200
    assert page1.json()["meta"]["total"] == 4
    assert page1.json()["meta"]["total_pages"] == 2
    assert len(page1.json()["data"]) == 2

    page2 = client.get("/api/v1/payments?page=2&limit=2", headers=admin_headers)
    assert page2.json()["meta"]["page"] == 2
    assert len(page2.json()["data"]) == 2

    ids = {p["id"] for p in page1.json()["data"]} | {p["id"] for p in page2.json()["data"]}
    assert len(ids) == 4

    # Search by local reference only.
    refs = client.get("/api/v1/payments?limit=100", headers=admin_headers).json()["data"]
    target_ref = next(p["reference"] for p in refs if p["kind"] == "subscription")
    by_ref = client.get(f"/api/v1/payments?search={target_ref}", headers=admin_headers)
    assert by_ref.json()["meta"]["total"] == 1
    assert by_ref.json()["data"][0]["reference"] == target_ref

    # Plate numbers are no longer searchable.
    by_plate = client.get("/api/v1/payments?search=PAG-002", headers=admin_headers)
    assert by_plate.json()["meta"]["total"] == 0
