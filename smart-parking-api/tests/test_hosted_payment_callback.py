"""Tests for the hosted wallet payment flow (payment_url + callback finalization)."""
from tests.test_wallet_payment_flow import (
    _book_tomorrow,
    _register_customer,
    _register_owner,
    _setup_lot_with_slot,
)
from tests.conftest import auth_headers, create_owner_wallet, set_phone


def _initiate_session_payment(client, customer_headers, session_id):
    init = client.post(f"/api/v1/parking-sessions/{session_id}/pay/initiate", headers=customer_headers)
    assert init.status_code == 201, init.text
    return init.json()["data"]


def _initiate_subscription_payment(client, owner_headers, pkg_id):
    init = client.post(
        "/api/v1/subscriptions/pay/initiate",
        json={"package_id": pkg_id},
        headers=owner_headers,
    )
    assert init.status_code == 201, init.text
    return init.json()["data"]


def test_initiate_returns_hosted_payment_url_for_session(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.hosted@test.com")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_hosted")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.hosted@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]

    data = _initiate_session_payment(client, customer_headers, session_id)
    assert data["wallet_payment_reference"].startswith("PAY-TEST-")
    assert data["wallet_payment_url"].startswith("http://wallet.local/external-payments/pay/")
    assert data["status"] == "PENDING"


def test_initiate_returns_hosted_payment_url_for_subscription(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.hsub@test.com")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    set_phone(client, owner_headers)

    data = _initiate_subscription_payment(client, owner_headers, pkg_id)
    assert data["wallet_payment_reference"].startswith("PAY-TEST-")
    assert data["wallet_payment_url"].startswith("http://wallet.local/external-payments/pay/")
    assert data["status"] == "PENDING"


def test_callback_finalizes_session_payment(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.cb@test.com")
    create_owner_wallet(client, owner_headers, api_key="sk_owner_cb")
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.cb@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    data = _initiate_session_payment(client, customer_headers, session_id)

    # Customer completes the payment on the wallet hosted page.
    client._fake_wallet.mark_completed(data["wallet_payment_reference"])

    # Wallet redirects the browser back to the parking callback.
    resp = client.get(
        "/api/v1/wallet-payment/callback",
        params={
            "reference": data["wallet_payment_reference"],
            "order_reference": data["reference"],
            "status": "success",
            "app": "customer",
        },
        follow_redirects=False,
    )
    assert resp.status_code == 303
    assert resp.headers["location"].startswith("http://localhost:5174/wallet-payment/result?")
    assert f"status=completed" in resp.headers["location"]
    assert f"reference={data['reference']}" in resp.headers["location"]

    # Payment + session are finalized on the parking side.
    session = client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]
    assert session["status"] == "ACTIVE"


def test_callback_is_idempotent(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.idem@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.idem@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    data = _initiate_session_payment(client, customer_headers, session_id)
    client._fake_wallet.mark_completed(data["wallet_payment_reference"])

    params = {
        "reference": data["wallet_payment_reference"],
        "order_reference": data["reference"],
        "status": "success",
        "app": "customer",
    }
    first = client.get("/api/v1/wallet-payment/callback", params=params, follow_redirects=False)
    assert first.status_code == 303

    second = client.get("/api/v1/wallet-payment/callback", params=params, follow_redirects=False)
    assert second.status_code == 303
    assert "status=completed" in second.headers["location"]


def test_callback_does_not_finalize_when_wallet_payment_pending(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.pendingcb@test.com")
    create_owner_wallet(client, owner_headers)
    slot_id, _ = _setup_lot_with_slot(client, admin_headers, owner_headers)

    customer_headers, car_id = _register_customer(client, email="cust.pendingcb@test.com")
    session_id = _book_tomorrow(client, customer_headers, car_id, slot_id)["id"]
    data = _initiate_session_payment(client, customer_headers, session_id)

    # Wallet payment never completed → callback must NOT mark it paid.
    resp = client.get(
        "/api/v1/wallet-payment/callback",
        params={
            "reference": data["wallet_payment_reference"],
            "order_reference": data["reference"],
            "status": "success",
            "app": "customer",
        },
        follow_redirects=False,
    )
    assert resp.status_code == 303
    assert "status=failed" in resp.headers["location"]

    session = client.get(f"/api/v1/parking-sessions/{session_id}", headers=customer_headers).json()["data"]
    assert session["status"] == "PENDING"


def test_callback_with_unknown_reference_redirects_failed(client, admin_user):
    resp = client.get(
        "/api/v1/wallet-payment/callback",
        params={"reference": "PAY-UNKNOWN", "status": "success", "app": "management"},
        follow_redirects=False,
    )
    assert resp.status_code == 303
    assert resp.headers["location"].startswith("http://localhost:5173/wallet-payment/result?")
    assert "status=failed" in resp.headers["location"]


def test_callback_finalizes_subscription_payment(client, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    owner_headers = _register_owner(client, "owner.subcb@test.com")

    pkg = client.post(
        "/api/v1/packages",
        json={"name": "Basic", "price": 9900.0, "duration_days": 30, "max_lots": 1, "max_staff": 5},
        headers=admin_headers,
    )
    pkg_id = pkg.json()["data"]["id"]
    set_phone(client, owner_headers)

    data = _initiate_subscription_payment(client, owner_headers, pkg_id)
    client._fake_wallet.mark_completed(data["wallet_payment_reference"])

    resp = client.get(
        "/api/v1/wallet-payment/callback",
        params={
            "reference": data["wallet_payment_reference"],
            "order_reference": data["reference"],
            "status": "success",
            "app": "management",
        },
        follow_redirects=False,
    )
    assert resp.status_code == 303
    assert resp.headers["location"].startswith("http://localhost:5173/wallet-payment/result?")
    assert "status=completed" in resp.headers["location"]

    subs = client.get("/api/v1/subscriptions/me", headers=owner_headers).json()["data"]
    assert any(s["package_id"] == pkg_id and s["status"] == "ACTIVE" for s in subs)
