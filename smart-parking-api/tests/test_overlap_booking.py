"""Tests verifying the 2-hour overlap buffer logic for customer bookings and direct staff starts."""
from datetime import datetime, timedelta, timezone
from tests.conftest import auth_headers


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
    client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)

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

    # Create customer and vehicle
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave Customer", "email": "dave.overlap@example.com", "password": "Customer@1234"},
    )
    customer_headers = auth_headers(client, "dave.overlap@example.com", "Customer@1234")

    vehicle_resp = client.post(
        "/api/v1/vehicles",
        headers=customer_headers,
        json={"plate_number": "YGN-777", "vehicle_type": "CAR"},
    )
    vehicle_id = vehicle_resp.json()["data"]["id"]

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
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": start_time,
            "end_time": end_time,
            "payment_method": "KBZPAY",
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
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": start_time_ok,
            "end_time": end_time_ok,
            "payment_method": "KBZPAY",
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
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": start_time_fail,
            "end_time": end_time_fail,
            "payment_method": "KBZPAY",
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
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": start_time_post_ok,
            "end_time": end_time_post_ok,
            "payment_method": "KBZPAY",
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
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": start_time_post_fail,
            "end_time": end_time_post_fail,
            "payment_method": "KBZPAY",
        }
    )
    assert book_post_fail_resp.status_code == 400
    assert "conflicts" in book_post_fail_resp.json()["message"]

    # 6. Try direct staff start when a booking is starting in less than 2 hours.
    # We will temporarily book a session starting 1 hour from now for this check.
    now = datetime.now(timezone.utc)
    soon_start = (now + timedelta(minutes=90)).isoformat()  # 1.5 hours from now
    soon_end = (now + timedelta(hours=3)).isoformat()
    client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "vehicle_id": vehicle_id,
            "slot_id": slot_id,
            "start_time": soon_start,
            "end_time": soon_end,
            "payment_method": "KBZPAY",
        }
    )
    # Now try to staff-start the slot directly.
    staff_start_resp = client.post(
        "/api/v1/parking-sessions/start",
        headers=staff_headers,
        json={"vehicle_id": vehicle_id, "slot_id": slot_id},
    )
    assert staff_start_resp.status_code == 400
    assert "booking starts soon" in staff_start_resp.json()["message"]
