"""Tests for parking staff listing and search."""
from tests.conftest import auth_headers, owner_register_json, purchase_and_activate


def test_owner_can_search_staff_by_name(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    client.post(
        "/api/v1/auth/register-owner",
        json=owner_register_json(
            name="Staff Search Owner",
            email="owner.staffsearch@test.com",
            password="Owner@1234",
            company_name="Staff Search Co",
        ),
    )
    owner_headers = auth_headers(client, "owner.staffsearch@test.com", "Owner@1234")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Staff Search Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    purchase_and_activate(client, owner_headers, pkg.json()["data"]["id"])

    lot_id = client.post(
        "/api/v1/parking-lots",
        headers=owner_headers,
        json={"name": "Search Lot Alpha", "rate_per_hour": 1000},
    ).json()["data"]["id"]

    client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={
            "name": "Alice Searchable",
            "email": "alice.staffsearch@test.com",
            "password": "Staff@1234",
            "parking_lot_id": lot_id,
        },
    )
    client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={
            "name": "Bob Other",
            "email": "bob.staffsearch@test.com",
            "password": "Staff@1234",
            "parking_lot_id": lot_id,
        },
    )

    searched = client.get("/api/v1/parking-staff?search=Alice", headers=owner_headers)
    assert searched.status_code == 200
    assert searched.json()["meta"]["total"] == 1
    assert searched.json()["data"][0]["user"]["name"] == "Alice Searchable"

    by_email = client.get("/api/v1/parking-staff?search=bob.staffsearch", headers=owner_headers)
    assert by_email.status_code == 200
    assert by_email.json()["meta"]["total"] == 1
    assert by_email.json()["data"][0]["user"]["email"] == "bob.staffsearch@test.com"

    by_lot = client.get("/api/v1/parking-staff?search=Alpha", headers=owner_headers)
    assert by_lot.status_code == 200
    assert by_lot.json()["meta"]["total"] == 2
