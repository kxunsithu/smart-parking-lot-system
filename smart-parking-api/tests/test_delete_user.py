"""Tests that deleting a user (parking owner / staff / customer) removes all related data."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.models.car import Car
from app.models.customer import Customer
from app.models.owner_subscription import OwnerSubscription
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.models.payment import Payment
from app.models.user import User
from app.models.wallet_account import WalletAccount
from tests.conftest import auth_headers, create_owner_wallet, purchase_and_activate

PKG_JSON = {"name": "Delete Test", "price": 9900.0, "duration_days": 30, "max_lots": 5, "max_staff": 20}


def _register_customer(client, email, phone, plate):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Customer", "email": email, "password": "Customer@1234", "phone": phone},
    )
    assert resp.status_code == 201, resp.text
    headers = auth_headers(client, email, "Customer@1234")
    car_id = client.post("/api/v1/cars", headers=headers, json={"plate_number": plate}).json()["data"]["id"]
    return headers, car_id


def _register_owner(client, email, phone):
    resp = client.post(
        "/api/v1/auth/register-owner",
        json={
            "name": "Owner",
            "email": email,
            "password": "Owner@1234",
            "confirm_password": "Owner@1234",
            "company_name": "Delete Co",
            "phone": phone,
        },
    )
    assert resp.status_code == 201, resp.text
    return auth_headers(client, email, "Owner@1234")


def _create_lot_with_slot(client, owner_headers, name, slot_number):
    lot_id = client.post(
        "/api/v1/parking-lots", headers=owner_headers, json={"name": name, "rate_per_hour": 1000}
    ).json()["data"]["id"]
    floor_id = client.post(
        "/api/v1/parking-floors", headers=owner_headers, json={"parking_lot_id": lot_id, "floor_name": "F1"}
    ).json()["data"]["id"]
    slot_id = client.post(
        "/api/v1/parking-slots", headers=owner_headers, json={"floor_id": floor_id, "slot_number": slot_number}
    ).json()["data"]["id"]
    return lot_id, slot_id


def _create_staff(client, owner_headers, lot_id, email):
    resp = client.post(
        "/api/v1/parking-staff",
        headers=owner_headers,
        json={"name": "Staff", "email": email, "password": "Staff@1234", "parking_lot_id": lot_id},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


def _book_and_pay_session(client, customer_headers, car_id, slot_id) -> int:
    base = datetime.now(timezone.utc).date() + timedelta(days=1)
    start = datetime(base.year, base.month, base.day, 9, 0, tzinfo=timezone.utc)
    book = client.post(
        "/api/v1/parking-sessions/book",
        headers=customer_headers,
        json={
            "car_id": car_id,
            "slot_id": slot_id,
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=2)).isoformat(),
        },
    )
    assert book.status_code == 201, book.text
    reference = book.json()["data"]["reference"]
    conf = client.post(
        "/api/v1/parking-sessions/pay/confirm",
        json={"reference": reference, "otp_code": "123456", "pin": "1234"},
        headers=customer_headers,
    )
    assert conf.status_code == 200, conf.text
    return conf.json()["data"]["session"]["id"]


def _create_package(client, admin_headers) -> int:
    pkg = client.post("/api/v1/packages", json=PKG_JSON, headers=admin_headers)
    assert pkg.status_code == 201, pkg.text
    return pkg.json()["data"]["id"]


def _count(db, model, *criteria) -> int:
    stmt = select(model)
    for criterion in criteria:
        stmt = stmt.where(criterion)
    return len(db.scalars(stmt).all())


def test_delete_customer_removes_cars_sessions_and_payments(client, db_session, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    pkg_id = _create_package(client, admin_headers)
    owner_headers = _register_owner(client, "del.owner.c@test.com", "+959000000031")
    purchase_and_activate(client, owner_headers, pkg_id)
    create_owner_wallet(client, owner_headers, api_key="sk_del_owner_c")
    lot_id, slot_id = _create_lot_with_slot(client, owner_headers, "Delete Lot C", "DC-01")

    cust_headers, car_id = _register_customer(
        client, email="del.cust@test.com", phone="+959000000041", plate="DEL-123"
    )
    session_id = _book_and_pay_session(client, cust_headers, car_id, slot_id)

    customer_user = db_session.scalar(select(User).where(User.email == "del.cust@test.com"))
    user_id = customer_user.id
    assert db_session.scalar(select(ParkingSession).where(ParkingSession.id == session_id))

    resp = client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    db_session.expire_all()

    assert db_session.scalar(select(User).where(User.id == user_id)) is None
    assert db_session.scalar(select(Customer).where(Customer.user_id == user_id)) is None
    assert db_session.scalar(select(Car).where(Car.id == car_id)) is None
    assert db_session.scalar(select(ParkingSession).where(ParkingSession.id == session_id)) is None
    assert _count(db_session, Payment, Payment.user_id == user_id) == 0

    # The owner's infrastructure is untouched by a customer deletion.
    assert db_session.scalar(select(ParkingLot).where(ParkingLot.id == lot_id))
    assert db_session.scalar(select(ParkingSlot).where(ParkingSlot.id == slot_id))


def test_delete_owner_removes_lots_staff_wallet_and_subscriptions(client, db_session, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    pkg_id = _create_package(client, admin_headers)
    owner_headers = _register_owner(client, "del.owner.o@test.com", "+959000000032")
    purchase_and_activate(client, owner_headers, pkg_id)
    create_owner_wallet(client, owner_headers, api_key="sk_del_owner_o")
    lot_id, slot_id = _create_lot_with_slot(client, owner_headers, "Delete Lot O", "DO-01")
    _create_staff(client, owner_headers, lot_id, email="del.staff@test.com")

    owner_id = client.get("/api/v1/parking-owners/me", headers=owner_headers).json()["data"]["id"]
    owner_user_id = db_session.scalar(select(ParkingOwner).where(ParkingOwner.id == owner_id)).user_id

    resp = client.delete(f"/api/v1/parking-owners/{owner_id}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    db_session.expire_all()

    assert db_session.scalar(select(User).where(User.id == owner_user_id)) is None
    assert db_session.scalar(select(ParkingOwner).where(ParkingOwner.id == owner_id)) is None
    assert db_session.scalar(select(ParkingLot).where(ParkingLot.id == lot_id)) is None
    assert db_session.scalar(select(ParkingSlot).where(ParkingSlot.id == slot_id)) is None
    assert _count(db_session, ParkingFloor, ParkingFloor.parking_lot_id == lot_id) == 0
    assert _count(db_session, ParkingStaff, ParkingStaff.parking_lot_id == lot_id) == 0
    assert db_session.scalar(select(User).where(User.email == "del.staff@test.com")) is None
    assert db_session.scalar(select(WalletAccount).where(WalletAccount.owner_id == owner_id)) is None
    assert _count(db_session, OwnerSubscription, OwnerSubscription.owner_id == owner_id) == 0


def test_delete_owner_via_users_endpoint_cleans_up_everything(client, db_session, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    pkg_id = _create_package(client, admin_headers)
    owner_headers = _register_owner(client, "del.owner.u@test.com", "+959000000033")
    purchase_and_activate(client, owner_headers, pkg_id)
    create_owner_wallet(client, owner_headers, api_key="sk_del_owner_u")
    lot_id, slot_id = _create_lot_with_slot(client, owner_headers, "Delete Lot U", "DU-01")
    _create_staff(client, owner_headers, lot_id, email="del.staff.u@test.com")

    owner = client.get("/api/v1/parking-owners/me", headers=owner_headers).json()["data"]

    resp = client.delete(f"/api/v1/users/{owner['user_id']}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    db_session.expire_all()

    assert db_session.scalar(select(User).where(User.id == owner["user_id"])) is None
    assert db_session.scalar(select(ParkingOwner).where(ParkingOwner.id == owner["id"])) is None
    assert db_session.scalar(select(ParkingLot).where(ParkingLot.id == lot_id)) is None
    assert db_session.scalar(select(ParkingSlot).where(ParkingSlot.id == slot_id)) is None
    assert _count(db_session, ParkingStaff, ParkingStaff.parking_lot_id == lot_id) == 0
    assert _count(db_session, WalletAccount, WalletAccount.owner_id == owner["id"]) == 0


def test_delete_staff_removes_the_staff_user(client, db_session, admin_user):
    admin_headers = auth_headers(client, "admin@test.com", "Admin@12345")
    pkg_id = _create_package(client, admin_headers)
    owner_headers = _register_owner(client, "del.owner.s@test.com", "+959000000034")
    purchase_and_activate(client, owner_headers, pkg_id)
    lot_id, _ = _create_lot_with_slot(client, owner_headers, "Delete Lot S", "DS-01")
    staff = _create_staff(client, owner_headers, lot_id, email="del.staff.s@test.com")
    assert db_session.scalar(select(User).where(User.id == staff["user_id"]))

    resp = client.delete(f"/api/v1/parking-staff/{staff['id']}", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    db_session.expire_all()

    assert db_session.scalar(select(ParkingStaff).where(ParkingStaff.id == staff["id"])) is None
    assert db_session.scalar(select(User).where(User.id == staff["user_id"])) is None
    # The owner and their lot survive a staff deletion.
    assert db_session.scalar(select(ParkingLot).where(ParkingLot.id == lot_id))