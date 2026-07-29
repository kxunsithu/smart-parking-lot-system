"""Tests for role-based access control enforcement."""
from tests.conftest import auth_headers


def test_customer_cannot_create_parking_lot(client, admin_user):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    headers = auth_headers(client, "dave@example.com", "Customer@1234")

    response = client.post("/api/v1/parking-lots", headers=headers, json={"name": "Lot A"})
    assert response.status_code == 403
    assert response.json()["success"] is False


def test_customer_cannot_access_admin_dashboard(client, admin_user):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    headers = auth_headers(client, "dave@example.com", "Customer@1234")

    response = client.get("/api/v1/dashboard/admin", headers=headers)
    assert response.status_code == 403


def test_non_admin_cannot_list_users(client, admin_user):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    headers = auth_headers(client, "dave@example.com", "Customer@1234")

    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 403


def test_owner_cannot_manage_other_owners_lot(client, admin_user):
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner One",
            "email": "owner1@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Company One",
        },
    )
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner Two",
            "email": "owner2@example.com",
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Company Two",
        },
    )

    owner1_headers = auth_headers(client, "owner1@example.com", "Owner@1234")
    owner2_headers = auth_headers(client, "owner2@example.com", "Owner@1234")

    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner1_headers, json={"name": "Owner1 Lot"}
    ).json()["data"]["id"]

    response = client.put(
        f"/api/v1/parking-lots/{lot_id}", headers=owner2_headers, json={"name": "Hacked Name"}
    )
    assert response.status_code == 403


def test_vehicle_owned_by_another_customer_is_forbidden(client, admin_user):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "Customer@1234"},
    )
    client.post(
        "/api/v1/auth/register",
        json={"name": "Eve", "email": "eve@example.com", "password": "Customer@1234"},
    )
    dave_headers = auth_headers(client, "dave@example.com", "Customer@1234")
    eve_headers = auth_headers(client, "eve@example.com", "Customer@1234")

    vehicle_id = client.post(
        "/api/v1/vehicles", headers=dave_headers, json={"plate_number": "XYZ-999"}
    ).json()["data"]["id"]

    response = client.put(
        f"/api/v1/vehicles/{vehicle_id}", headers=eve_headers, json={"color": "Red"}
    )
    assert response.status_code == 403
