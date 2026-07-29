"""End-to-end tests covering the core parking lot business flow."""
from tests.conftest import auth_headers


def test_full_parking_flow(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

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

    # Customer registers and adds a vehicle.
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave Customer", "email": "dave@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave@example.com", "Customer@1234")

    vehicle_resp = client.post(
        "/api/v1/vehicles",
        headers=customer_headers,
        json={"plate_number": "ABC-1234", "vehicle_type": "CAR"},
    )
    assert vehicle_resp.status_code == 201
    vehicle_id = vehicle_resp.json()["data"]["id"]

    # Staff starts a parking session directly (no reservation needed).
    session_resp = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"vehicle_id": vehicle_id, "slot_id": slot_id},
    )
    assert session_resp.status_code == 201
    session_id = session_resp.json()["data"]["id"]
    assert session_resp.json()["data"]["status"] == "ACTIVE"

    # Slot should now be OCCUPIED.
    slot_check = client.get(f"/api/v1/parking-slots/{slot_id}", headers=customer_headers)
    assert slot_check.json()["data"]["status"] == "OCCUPIED"

    # A second session on the same slot must fail.
    second_session = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"vehicle_id": vehicle_id, "slot_id": slot_id},
    )
    assert second_session.status_code == 400

    # Staff finishes the session.
    finish_resp = client.patch(
        f"/api/v1/parking-sessions/{session_id}/finish", headers=staff_headers, json={}
    )
    assert finish_resp.status_code == 200
    finished_data = finish_resp.json()["data"]
    assert finished_data["status"] == "FINISHED"
    assert finished_data["fee"] is not None

    # Slot should be back to AVAILABLE.
    slot_after = client.get(f"/api/v1/parking-slots/{slot_id}", headers=customer_headers)
    assert slot_after.json()["data"]["status"] == "AVAILABLE"

    # Customer pays for the session.
    payment_resp = client.post(
        "/api/v1/payments/",
        headers=customer_headers,
        json={
            "parking_session_id": session_id,
            "amount": finished_data["fee"],
            "payment_method": "KBZPAY",
        },
    )
    assert payment_resp.status_code == 201
    assert payment_resp.json()["data"]["status"] == "PAID"

    # Admin dashboard reflects the activity.
    dashboard_resp = client.get("/api/v1/dashboard/admin", headers=admin_headers)
    assert dashboard_resp.status_code == 200
    dashboard_data = dashboard_resp.json()["data"]
    assert dashboard_data["total_owners"] == 1
    assert dashboard_data["total_parking_lots"] == 1
    assert dashboard_data["total_revenue"] == finished_data["fee"]


def test_only_available_slot_can_start_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

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

    # Customer registers a vehicle.
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave@example.com", "Customer@1234")
    vehicle_resp = client.post(
        "/api/v1/vehicles",
        headers=customer_headers,
        json={"plate_number": "XYZ-9999", "vehicle_type": "CAR"},
    )
    vehicle_id = vehicle_resp.json()["data"]["id"]

    # Starting a session on an OCCUPIED slot must fail.
    session_resp = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"vehicle_id": vehicle_id, "slot_id": slot_id},
    )
    assert session_resp.status_code == 400
