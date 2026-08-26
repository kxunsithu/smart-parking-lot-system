"""Tests for role-specific dashboard statistics."""
from tests.conftest import auth_headers, create_owner_wallet, customer_register_json, owner_register_json, purchase_and_activate


def test_admin_dashboard_total_revenue_sums_completed_payments(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")

    client.post("/api/v1/auth/register-owner", json=owner_register_json(
        name="Revenue Owner",
        email="owner.revenue@test.com",
        password="Owner@1234",
        company_name="Revenue Co",
    ))
    owner_headers = auth_headers(client, "owner.revenue@test.com", "Owner@1234")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_revenue")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Revenue Basic", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20},
        headers=admin_headers,
    )
    purchase_and_activate(client, owner_headers, pkg.json()["data"]["id"])

    before = client.get("/api/v1/dashboard/admin", headers=admin_headers)
    assert before.status_code == 200
    assert before.json()["data"]["total_revenue"] > 0

    payments = client.get("/api/v1/payments?limit=100", headers=admin_headers).json()["data"]
    expected_total = sum(p["amount"] for p in payments if p["status"] == "COMPLETED")

    dashboard = client.get("/api/v1/dashboard/admin", headers=admin_headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["data"]["total_revenue"] == expected_total
