"""Tests for the subscription package feature."""
from tests.conftest import auth_headers


def test_admin_can_create_package(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    resp = client.post(
        "/api/v1/packages",
        json={
            "name": "Basic",
            "description": "1 lot, 5 staff",
            "price": 9900.0,
            "duration_days": 30,
            "max_lots": 1,
            "max_staff": 5,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Basic"
    assert data["max_lots"] == 1
    assert data["is_active"] is True


def test_admin_can_list_and_update_package(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Create
    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Pro", "price": 24900.0, "duration_days": 30, "max_lots": 3, "max_staff": 20},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    # List
    list_resp = client.get("/api/v1/packages", headers=admin_headers)
    assert list_resp.status_code == 200
    assert any(p["id"] == pkg_id for p in list_resp.json()["data"])

    # Update
    upd_resp = client.put(
        f"/api/v1/packages/{pkg_id}",
        json={"price": 19900.0},
        headers=admin_headers,
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["data"]["price"] == 19900.0


def test_owner_can_purchase_subscription(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Create a package
    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    # Register an owner
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner User",
            "email": "owner@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "TestCo",
        },
    )
    owner_headers = auth_headers(client, "owner@test.com", "Owner@12345")

    # Purchase subscription with payment details
    resp = client.post(
        "/api/v1/subscriptions/purchase",
        json={"package_id": pkg_id, "payment_method": "KBZPAY", "transaction_ref": "KBZ12345678"},
        headers=owner_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["status"] == "ACTIVE"
    assert data["package"]["name"] == "Basic"
    assert data["payment_method"] == "KBZPAY"
    assert data["amount"] == 9900.0
    assert data["transaction_ref"] == "KBZ12345678"


def test_owner_without_subscription_cannot_create_lot(client, admin_user):
    # Register owner
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "No-Sub Owner",
            "email": "nosub@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "NoSubCo",
        },
    )
    nosub_headers = auth_headers(client, "nosub@test.com", "Owner@12345")

    # Try to create a lot without subscription → should fail
    resp = client.post(
        "/api/v1/parking-lots",
        json={"name": "My Lot", "owner_id": None},
        headers=nosub_headers,
    )
    assert resp.status_code == 403


def test_owner_with_subscription_can_create_lot(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Create package
    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    # Register + subscribe owner
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Sub Owner",
            "email": "subowner@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "SubCo",
        },
    )
    owner_headers = auth_headers(client, "subowner@test.com", "Owner@12345")

    client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)

    # Now create a lot → should succeed
    resp = client.post(
        "/api/v1/parking-lots",
        json={"name": "My Subscribed Lot"},
        headers=owner_headers,
    )
    assert resp.status_code == 201


def test_max_lots_limit_enforced(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    # Create a Basic package (max_lots=1)
    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    # Register + subscribe owner
    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Limit Owner",
            "email": "limit@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "LimitCo",
        },
    )
    owner_headers = auth_headers(client, "limit@test.com", "Owner@12345")
    client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)

    # Create 1 lot → succeeds
    resp1 = client.post("/api/v1/parking-lots", json={"name": "Lot 1"}, headers=owner_headers)
    assert resp1.status_code == 201

    # Create 2nd lot → fails (max_lots=1)
    resp2 = client.post("/api/v1/parking-lots", json={"name": "Lot 2"}, headers=owner_headers)
    assert resp2.status_code == 403


def test_owner_can_renew_subscription(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Renew Owner",
            "email": "renew@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "RenewCo",
        },
    )
    owner_headers = auth_headers(client, "renew@test.com", "Owner@12345")

    # Purchase
    purchase_resp = client.post(
        "/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers
    )
    original_expires = purchase_resp.json()["data"]["expires_at"]

    # Renew
    renew_resp = client.post(
        "/api/v1/subscriptions/renew", json={"package_id": pkg_id}, headers=owner_headers
    )
    assert renew_resp.status_code == 201
    new_expires = renew_resp.json()["data"]["expires_at"]

    # New expiry should be after original
    assert new_expires > original_expires


def test_owner_can_view_own_subscriptions(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    pkg_resp = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg_resp.json()["data"]["id"]

    client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "View Owner",
            "email": "view@test.com",
            "password": "Owner@12345",
            "confirm_password": "Owner@12345",
            "company_name": "ViewCo",
        },
    )
    owner_headers = auth_headers(client, "view@test.com", "Owner@12345")
    client.post("/api/v1/subscriptions/purchase", json={"package_id": pkg_id}, headers=owner_headers)

    me_resp = client.get("/api/v1/subscriptions/me", headers=owner_headers)
    assert me_resp.status_code == 200
    subs = me_resp.json()["data"]
    assert len(subs) >= 1
    assert subs[0]["status"] == "ACTIVE"


def test_admin_can_list_all_subscriptions(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    resp = client.get("/api/v1/subscriptions", headers=admin_headers)
    assert resp.status_code == 200
    assert "data" in resp.json()
