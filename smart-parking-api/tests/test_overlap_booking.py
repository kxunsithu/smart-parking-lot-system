"""Tests verifying the 2-hour overlap buffer logic for customer bookings."""
from datetime import datetime, timedelta, timezone
from tests.conftest import auth_headers, purchase_and_activate


def test_overlap_booking_buffer(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Create package, register owner, and subscribe
    resp_pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = resp_pkg.json()["data"]["id"]

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Bob Owner",
            "email": "bob.overlap@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Overlap Parking",
        },
    )
    owner_headers = auth_headers(client, "bob.overlap@example.com", "Owner@1234")
    purchase_and_activate(client, owner_headers, pkg_id)

    # Owner creates parking lot, floor, and slot
    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "Buffer Lot", "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "Floor 1"}
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": "SL-01"}
    ).json()["data"]["id"]

    # Owner creates staff
    client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={
            "name": "Carol Staff",
            "email": "carol.overlap@example.com",
            "password": "Staff@1234",
            "parking_lot_id": lot_id,
        },
    )
    staff_headers = auth_headers(client, "carol.overlap@example.com", "Staff@1234")

    # Create customer and car
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave Customer", "email": "dave.overlap@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave.overlap@example.com", "Customer@1234")

    car_resp = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "YGN-777"},
    )
    car_id = car_resp.json()["data"]["id"]

    # A second car used for the slot-buffer scenarios so the same-car overlap
    # check does not shadow the 2-hour slot buffer behaviour.
    car_b_resp = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "YGN-778"},
    )
    car_b_id = car_b_resp.json()["data"]["id"]

    # A third car for the failing buffer scenarios (no prior sessions, so only
    # the slot buffer conflict applies).
    car_c_resp = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "YGN-779"},
    )
    car_c_id = car_c_resp.json()["data"]["id"]

    # Let's define the base time for testing (say tomorrow at 3:00 PM UTC)
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base_time = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 15, 0, tzinfo=timezone.utc)  # 3:00 PM

    # 1. Book initial session: 03:00 PM to 05:30 PM
    start_time = base_time.isoformat()
    end_time = (base_time + timedelta(hours=2, minutes=30)).isoformat() # 5:30 PM
    book_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_id,
            "start_time": start_time,
            "end_time": end_time,
        }
    )
    assert book_resp.status_code == 201

    # 2. Try booking slot ending exactly 2 hours before 03:00 PM (starts 12:00 PM, ends 01:00 PM) -> SUCCESS
    start_time_ok = (base_time - timedelta(hours=3)).isoformat()  # 12:00 PM
    end_time_ok = (base_time - timedelta(hours=2)).isoformat()    # 1:00 PM
    book_ok_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_b_id,
            "slot_id": slot_id,
            "start_time": start_time_ok,
            "end_time": end_time_ok,
        }
    )
    assert book_ok_resp.status_code == 201

    # 3. Try booking slot ending 1.5 hours before 03:00 PM (starts 12:00 PM, ends 01:30 PM) -> FAILURE
    start_time_fail = (base_time - timedelta(hours=3)).isoformat()  # 12:00 PM
    end_time_fail = (base_time - timedelta(hours=1, minutes=30)).isoformat()  # 1:30 PM
    book_fail_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_c_id,
            "slot_id": slot_id,
            "start_time": start_time_fail,
            "end_time": end_time_fail,
        }
    )
    assert book_fail_resp.status_code == 400
    assert "conflicts" in book_fail_resp.json()["message"]

    # 4. Try booking slot starting exactly 2 hours after 05:30 PM (starts 07:30 PM, ends 09:00 PM) -> SUCCESS
    start_time_post_ok = (base_time + timedelta(hours=4, minutes=30)).isoformat() # 7:30 PM
    end_time_post_ok = (base_time + timedelta(hours=6)).isoformat() # 9:00 PM
    book_post_ok_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_b_id,
            "slot_id": slot_id,
            "start_time": start_time_post_ok,
            "end_time": end_time_post_ok,
        }
    )
    assert book_post_ok_resp.status_code == 201

    # 5. Try booking slot starting 1.5 hours after 05:30 PM (starts 07:00 PM, ends 08:30 PM) -> FAILURE
    start_time_post_fail = (base_time + timedelta(hours=4)).isoformat() # 7:00 PM
    end_time_post_fail = (base_time + timedelta(hours=5, minutes=30)).isoformat() # 8:30 PM
    book_post_fail_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_c_id,
            "slot_id": slot_id,
            "start_time": start_time_post_fail,
            "end_time": end_time_post_fail,
        }
    )
    assert book_post_fail_resp.status_code == 400
    assert "conflicts" in book_post_fail_resp.json()["message"]


def test_car_cannot_book_overlapping_session_on_different_slot(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    resp_pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = resp_pkg.json()["data"]["id"]

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Bob Owner",
            "email": "bob.car-overlap@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Car Overlap Parking",
        },
    )
    owner_headers = auth_headers(client, "bob.car-overlap@example.com", "Owner@1234")
    purchase_and_activate(client, owner_headers, pkg_id)

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": "Car Overlap Lot", "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "Floor 1"}
    ).json()["data"]["id"]
    slot_a = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": "SL-A"}
    ).json()["data"]["id"]
    slot_b = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": "SL-B"}
    ).json()["data"]["id"]

    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave Customer", "email": "dave.car-overlap@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave.car-overlap@example.com", "Customer@1234")

    car_id = client.post(
        "/api/v1/cars",
        headers=customer_headers,
        json={"plate_number": "YGN-888"},
    ).json()["data"]["id"]

    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    base_time = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 15, 0, tzinfo=timezone.utc)

    first_start = base_time.isoformat()
    first_end = (base_time + timedelta(hours=2)).isoformat()
    assert client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_a,
            "start_time": first_start,
            "end_time": first_end,
        },
    ).status_code == 201

    overlap_start = (base_time + timedelta(hours=1)).isoformat()
    overlap_end = (base_time + timedelta(hours=3)).isoformat()
    overlap_resp = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_b,
            "start_time": overlap_start,
            "end_time": overlap_end,
        },
    )
    assert overlap_resp.status_code == 400
    assert "car already has a session" in overlap_resp.json()["message"].lower()

    later_start = (base_time + timedelta(hours=3)).isoformat()
    later_end = (base_time + timedelta(hours=5)).isoformat()
    assert client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_b,
            "start_time": later_start,
            "end_time": later_end,
        },
    ).status_code == 201
