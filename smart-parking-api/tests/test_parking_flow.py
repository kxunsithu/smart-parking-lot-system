"""End-to-end tests covering the core parking lot business flow."""
from tests.conftest import auth_headers, purchase_and_activate


def _create_basic_package(client, admin_headers) -> int:
    """Helper: create a Basic package and return its id."""
    resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    return resp.json()["data"]["id"]


def _subscribe_owner(client, owner_headers, pkg_id: int):
    """Helper: purchase + pay for a subscription for the current owner."""
    purchase_and_activate(client, owner_headers, pkg_id)


def test_full_parking_flow(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Admin creates a subscription package
    pkg_id = _create_basic_package(client, admin_headers)

    # Register an Owner.
    owner_resp = client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Bob Owner",
            "email": "bob@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Bob's Parking",
        },
    )
    assert owner_resp.status_code == 201

    owner_headers = auth_headers(client, "bob@example.com", "Owner@1234")

    # Owner buys a subscription
    _subscribe_owner(client, owner_headers, pkg_id)

    # Owner creates a Parking Lot.
    lot_resp = client.post(
        "/api/v1/parking-lots",
        headers=owner_headers,
        json={"name": "Downtown Lot", "type": "Outdoor", "address": "100 Market St"},
    )
    assert lot_resp.status_code == 201
    lot_id = lot_resp.json()["data"]["id"]

    # Owner creates a Floor.
    floor_resp = client.post(
        "/api/v1/parking-floors",
        headers=owner_headers,
        json={"parking_lot_id": lot_id, "floor_name": "Ground Floor"},
    )
    assert floor_resp.status_code == 201
    floor_id = floor_resp.json()["data"]["id"]

    # Owner creates a Slot.
    slot_resp = client.post(
        "/api/v1/parking-slots",
        headers=owner_headers,
        json={"floor_id": floor_id, "slot_number": "G-01", "section": "A"},
    )
    assert slot_resp.status_code == 201
    slot_id = slot_resp.json()["data"]["id"]
    assert slot_resp.json()["data"]["status"] == "AVAILABLE"

    # Owner creates a Staff member.
    staff_resp = client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={
            "name": "Carol Staff",
            "email": "carol@example.com",
            "password": "Staff@1234",
            "parking_lot_id": lot_id,
        },
    )
    assert staff_resp.status_code == 201
    staff_headers = auth_headers(client, "carol@example.com", "Staff@1234")

    # Customer registers and adds a car.
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave Customer", "email": "dave@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave@example.com", "Customer@1234")

    car_resp = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "ABC-1234"},
    )
    assert car_resp.status_code == 201
    car_id = car_resp.json()["data"]["id"]

    # Direct staff start is disabled
    session_resp = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"car_id": car_id, "slot_id": slot_id},
    )
    assert session_resp.status_code == 403


def test_only_available_slot_can_start_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg_id = _create_basic_package(client, admin_headers)

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Bob Owner",
            "email": "bob@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Bob's Parking",
        },
    )
    owner_headers = auth_headers(client, "bob@example.com", "Owner@1234")
    _subscribe_owner(client, owner_headers, pkg_id)

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "Lot A"}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors",
        headers=owner_headers,
        json={"parking_lot_id": lot_id, "floor_name": "F1"},
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots",
        headers=owner_headers,
        json={"floor_id": floor_id, "slot_number": "S1"},
    ).json()["data"]["id"]

    # Manually mark slot OCCUPIED via status endpoint.
    client.patch(
        f"/api/v1/parking-slots/{slot_id}/status", headers=owner_headers, json={"status": "OCCUPIED"}
    )

    # Owner creates a staff member.
    client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={
            "name": "Carol Staff",
            "email": "carol@example.com",
            "password": "Staff@1234",
            "parking_lot_id": lot_id,
        },
    )
    staff_headers = auth_headers(client, "carol@example.com", "Staff@1234")

    # Customer registers a car.
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave@example.com", "Customer@1234")
    car_resp = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "XYZ-9999"},
    )
    car_id = car_resp.json()["data"]["id"]

    # Starting a session via start endpoint must fail with 403
    session_resp = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"car_id": car_id, "slot_id": slot_id},
    )
    assert session_resp.status_code == 403
