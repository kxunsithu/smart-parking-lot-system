"""Tests for authentication endpoints: register, login, refresh, logout, profile."""
from tests.conftest import auth_headers


def test_register_customer_success(client, seed_roles):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Dave Customer",
            "email": "dave@example.com",
            "password": "Customer@1234",
            "phone": "+10000000004",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["email"] == "dave@example.com"
    assert body["data"]["role"]["name"] == "CUSTOMER"


def test_register_duplicate_email_fails(client, seed_roles):
    payload = {
        "name": "Dave Customer",
        "email": "dave@example.com",
        "password": "Customer@1234",
    }
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    body = second.json()
    assert body["success"] is False
    assert body["errors"][0]["field"] == "email"


def test_login_success(client, admin_user):
    response = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "Admin@12345"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]


def test_login_invalid_credentials(client, admin_user):
    response = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "wrong-password"}
    )
    assert response.status_code == 401
    assert response.json()["success"] is False


def test_get_current_user(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "admin@test.com"


def test_get_current_user_without_token_fails(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_refresh_and_logout(client, admin_user):
    login_response = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "Admin@12345"}
    )
    refresh_token = login_response.json()["data"]["refresh_token"]

    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == 200
    new_tokens = refresh_response.json()["data"]
    assert new_tokens["access_token"]

    logout_response = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert logout_response.status_code == 200

    reuse_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_response.status_code == 401


def test_change_password(client, admin_user):
    headers = auth_headers(client, "admin@test.com", "Admin@12345")
    response = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"old_password": "Admin@12345", "new_password": "NewAdmin@12345"},
    )
    assert response.status_code == 200

    old_login = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "Admin@12345"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "NewAdmin@12345"}
    )
    assert new_login.status_code == 200
