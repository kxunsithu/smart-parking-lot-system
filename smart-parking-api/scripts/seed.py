"""Seed script: creates default roles, packages, users (admin / 3 owners / 5 staff / 2 customers),
5 real Yangon parking lots with GPS coordinates, floors, slots, subscriptions, and customer cars.

Usage (from the smart-parking-api directory):
    python -m scripts.seed
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config.settings import settings
from app.core.constants import LotType, RoleName, SlotStatus, SubscriptionStatus
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.car import Car
from app.models.customer import Customer
from app.models.owner_subscription import OwnerSubscription
from app.models.package import Package
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.models.role import Role
from app.models.user import User

# ---------------------------------------------------------------------------
# Roles & Packages
# ---------------------------------------------------------------------------

DEFAULT_ROLES = [
    (RoleName.ADMIN.value, "System administrator"),
    (RoleName.OWNER.value, "Parking owner"),
    (RoleName.STAFF.value, "Parking staff"),
    (RoleName.CUSTOMER.value, "End customer"),
]

DEFAULT_PACKAGES = [
    {
        "name": "Basic",
        "description": "Ideal for small operators — 1 lot, up to 5 staff",
        "price": 9900.0,
        "duration_days": 30,
        "max_lots": 1,
        "max_staff": 5,
    },
    {
        "name": "Pro",
        "description": "For growing businesses — up to 3 lots, 20 staff",
        "price": 24900.0,
        "duration_days": 30,
        "max_lots": 3,
        "max_staff": 20,
    },
    {
        "name": "Enterprise",
        "description": "Unlimited scale — up to 10 lots, unlimited staff",
        "price": 49900.0,
        "duration_days": 30,
        "max_lots": 10,
        "max_staff": 999,
    },
]

PASSWORD = "asdffdsa"

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

SEED_USERS = [
    # ── Admin ────────────────────────────────────────────────────────────────
    {
        "name": "System Admin",
        "email": "khunsithu350@gmail.com",
        "role": RoleName.ADMIN.value,
        "phone": "+959000000001",
        "is_verified": True,
    },
    # ── Owners ───────────────────────────────────────────────────────────────
    {
        "name": "Khun Si Thu",
        "email": "khunsithuaung50@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959000000002",
        "is_verified": True,
    },
    {
        "name": "Myo Aung",
        "email": "myoaung.owner@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959111000010",
        "is_verified": True,
    },
    {
        "name": "Thida Win",
        "email": "thidawin.owner@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959222000020",
        "is_verified": True,
    },
    # ── Staff ─────────────────────────────────────────────────────────────────
    {
        "name": "Khun Si Thu (Staff)",
        "email": "khunsithu2003@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959000000003",
        "is_verified": True,
    },
    {
        "name": "Zaw Lin",
        "email": "zawlin.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959111000011",
        "is_verified": True,
    },
    {
        "name": "Su Su Htwe",
        "email": "susuhtwe.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959222000021",
        "is_verified": True,
    },
    {
        "name": "Kyaw Kyaw",
        "email": "kyawkyaw.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959222000022",
        "is_verified": True,
    },
    {
        "name": "Aye Myat Mon",
        "email": "ayemyatmon.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959111000012",
        "is_verified": True,
    },
    # ── Customers ────────────────────────────────────────────────────────────
    {
        "name": "Khun Si Thu (Customer)",
        "email": "khunsithuaung35@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959000000004",
        "is_verified": True,
    },
    {
        "name": "Naing Lin",
        "email": "nainglin.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959333000030",
        "is_verified": True,
    },
]

# ---------------------------------------------------------------------------
# Owner profiles  →  company name & subscription package
# ---------------------------------------------------------------------------

OWNER_PROFILES = {
    "khunsithuaung50@gmail.com": {
        "company_name": "KST Parking Co., Ltd.",
        "package": "Pro",
    },
    "myoaung.owner@gmail.com": {
        "company_name": "MA Parking Solutions",
        "package": "Basic",
    },
    "thidawin.owner@gmail.com": {
        "company_name": "TW Premium Parking",
        "package": "Enterprise",
    },
}

# ---------------------------------------------------------------------------
# Parking lots  — real Yangon, Myanmar locations with GPS coordinates
# ---------------------------------------------------------------------------
# Format per lot:
#   owner_email     → who owns it
#   name            → display name
#   google_map_url  → real Google Maps link
#   type            → PUBLIC / PRIVATE
#   rate_per_hour   → MMK per hour
#   floors          → list of { floor_name, slots: [{ slot_number, section, lat, lng }] }
#   staff           → list of staff emails that manage this lot
# ---------------------------------------------------------------------------

PARKING_LOTS = [
    # ── 1. Yangon Central Parking (near Sule Pagoda, Downtown) ────────────
    {
        "owner_email": "khunsithuaung50@gmail.com",
        "name": "Yangon Central Parking",
        "google_map_url": "https://maps.google.com/?q=16.77410,96.15940",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": ["khunsithu2003@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.77411, "longitude": 96.15941},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.77412, "longitude": 96.15942},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.77413, "longitude": 96.15943},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.77414, "longitude": 96.15944},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.77415, "longitude": 96.15945},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.77416, "longitude": 96.15946},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.77421, "longitude": 96.15941},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.77422, "longitude": 96.15942},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.77423, "longitude": 96.15943},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.77424, "longitude": 96.15944},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.77425, "longitude": 96.15945},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.77426, "longitude": 96.15946},
                ],
            },
        ],
    },

    # ── 2. Bogyoke Market Parking (Pabedan Tsp) ───────────────────────────
    {
        "owner_email": "khunsithuaung50@gmail.com",
        "name": "Bogyoke Market Parking",
        "google_map_url": "https://maps.google.com/?q=16.78210,96.15430",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["ayemyatmon.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.78211, "longitude": 96.15431},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.78212, "longitude": 96.15432},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.78213, "longitude": 96.15433},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.78214, "longitude": 96.15434},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.78215, "longitude": 96.15435},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.78216, "longitude": 96.15436},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.78217, "longitude": 96.15437},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.78218, "longitude": 96.15438},
                ],
            },
        ],
    },

    # ── 3. Sule Square Parking (Kyauktada Tsp) ───────────────────────────
    {
        "owner_email": "myoaung.owner@gmail.com",
        "name": "Sule Square Parking",
        "google_map_url": "https://maps.google.com/?q=16.77690,96.15890",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 800.0,
        "staff_emails": ["zawlin.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.77691, "longitude": 96.15891},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.77692, "longitude": 96.15892},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.77693, "longitude": 96.15893},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.77694, "longitude": 96.15894},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.77695, "longitude": 96.15895},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.77696, "longitude": 96.15896},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.77701, "longitude": 96.15891},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.77702, "longitude": 96.15892},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.77703, "longitude": 96.15893},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.77704, "longitude": 96.15894},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.77705, "longitude": 96.15895},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.77706, "longitude": 96.15896},
                ],
            },
        ],
    },

    # ── 4. Junction Square Parking (Mayangone Tsp) ───────────────────────
    {
        "owner_email": "thidawin.owner@gmail.com",
        "name": "Junction Square Parking",
        "google_map_url": "https://maps.google.com/?q=16.83150,96.13450",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 700.0,
        "staff_emails": ["susuhtwe.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.83151, "longitude": 96.13451},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.83152, "longitude": 96.13452},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.83153, "longitude": 96.13453},
                    {"slot_number": "B1-A04", "section": "A", "latitude": 16.83154, "longitude": 96.13454},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.83155, "longitude": 96.13455},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.83156, "longitude": 96.13456},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.83157, "longitude": 96.13457},
                    {"slot_number": "B1-B04", "section": "B", "latitude": 16.83158, "longitude": 96.13458},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.83161, "longitude": 96.13451},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.83162, "longitude": 96.13452},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.83163, "longitude": 96.13453},
                    {"slot_number": "L1-A04", "section": "A", "latitude": 16.83164, "longitude": 96.13454},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.83165, "longitude": 96.13455},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.83166, "longitude": 96.13456},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.83167, "longitude": 96.13457},
                    {"slot_number": "L1-B04", "section": "B", "latitude": 16.83168, "longitude": 96.13458},
                ],
            },
            {
                "floor_name": "Level 2 (L2)",
                "slots": [
                    {"slot_number": "L2-A01", "section": "A", "latitude": 16.83171, "longitude": 96.13451},
                    {"slot_number": "L2-A02", "section": "A", "latitude": 16.83172, "longitude": 96.13452},
                    {"slot_number": "L2-A03", "section": "A", "latitude": 16.83173, "longitude": 96.13453},
                    {"slot_number": "L2-B01", "section": "B", "latitude": 16.83174, "longitude": 96.13454},
                    {"slot_number": "L2-B02", "section": "B", "latitude": 16.83175, "longitude": 96.13455},
                    {"slot_number": "L2-B03", "section": "B", "latitude": 16.83176, "longitude": 96.13456},
                ],
            },
        ],
    },

    # ── 5. Junction City Parking (Pabedan Tsp — near Bogyoke) ────────────
    {
        "owner_email": "thidawin.owner@gmail.com",
        "name": "Junction City Parking",
        "google_map_url": "https://maps.google.com/?q=16.79020,96.14520",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 1000.0,
        "staff_emails": ["kyawkyaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement 1 (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.79021, "longitude": 96.14521},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.79022, "longitude": 96.14522},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.79023, "longitude": 96.14523},
                    {"slot_number": "B1-A04", "section": "A", "latitude": 16.79024, "longitude": 96.14524},
                    {"slot_number": "B1-A05", "section": "A", "latitude": 16.79025, "longitude": 96.14525},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.79026, "longitude": 96.14526},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.79027, "longitude": 96.14527},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.79028, "longitude": 96.14528},
                    {"slot_number": "B1-B04", "section": "B", "latitude": 16.79029, "longitude": 96.14529},
                    {"slot_number": "B1-B05", "section": "B", "latitude": 16.79030, "longitude": 96.14530},
                ],
            },
            {
                "floor_name": "Basement 2 (B2)",
                "slots": [
                    {"slot_number": "B2-A01", "section": "A", "latitude": 16.79031, "longitude": 96.14521},
                    {"slot_number": "B2-A02", "section": "A", "latitude": 16.79032, "longitude": 96.14522},
                    {"slot_number": "B2-A03", "section": "A", "latitude": 16.79033, "longitude": 96.14523},
                    {"slot_number": "B2-A04", "section": "A", "latitude": 16.79034, "longitude": 96.14524},
                    {"slot_number": "B2-A05", "section": "A", "latitude": 16.79035, "longitude": 96.14525},
                    {"slot_number": "B2-B01", "section": "B", "latitude": 16.79036, "longitude": 96.14526},
                    {"slot_number": "B2-B02", "section": "B", "latitude": 16.79037, "longitude": 96.14527},
                    {"slot_number": "B2-B03", "section": "B", "latitude": 16.79038, "longitude": 96.14528},
                    {"slot_number": "B2-B04", "section": "B", "latitude": 16.79039, "longitude": 96.14529},
                    {"slot_number": "B2-B05", "section": "B", "latitude": 16.79040, "longitude": 96.14530},
                ],
            },
        ],
    },
]

# ---------------------------------------------------------------------------
# Customer cars
# ---------------------------------------------------------------------------

CUSTOMER_CARS = {
    "khunsithuaung35@gmail.com": [
        {"plate_number": "1A-1234", "brand": "Toyota", "color": "Silver"},
    ],
    "nainglin.customer@gmail.com": [
        {"plate_number": "2B-5678", "brand": "Honda", "color": "White"},
        {"plate_number": "3C-9012", "brand": "Suzuki", "color": "Red"},
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_role(db, name: str, description: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=description)
        db.add(role)
        db.flush()
        print(f"  [+] Role created: {name}")
    else:
        print(f"  [=] Role exists:  {name}")
    return role


def _get_or_create_user(db, name: str, email: str, role_id: int, phone: str, is_verified: bool) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password=hash_password(PASSWORD),
            role_id=role_id,
            phone=phone,
            is_active=True,
            is_verified=is_verified,
        )
        db.add(user)
        db.flush()
        print(f"  [+] User created:  {email}  ({name})")
    else:
        print(f"  [=] User exists:   {email}")
    return user


def _get_or_create_package(db, pkg_data: dict) -> Package:
    pkg = db.query(Package).filter(Package.name == pkg_data["name"]).first()
    if not pkg:
        pkg = Package(**pkg_data)
        db.add(pkg)
        db.flush()
        print(f"  [+] Package created: {pkg_data['name']}")
    else:
        print(f"  [=] Package exists:  {pkg_data['name']}")
    return pkg


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

def seed() -> None:
    db = SessionLocal()
    try:
        # ── Roles ───────────────────────────────────────────────────────────
        print("\n── Roles ─────────────────────────────────────────────────────")
        role_map: dict[str, Role] = {}
        for name, description in DEFAULT_ROLES:
            role = _get_or_create_role(db, name, description)
            role_map[name] = role

        # ── Packages ────────────────────────────────────────────────────────
        print("\n── Packages ──────────────────────────────────────────────────")
        package_map: dict[str, Package] = {}
        for pkg_data in DEFAULT_PACKAGES:
            pkg = _get_or_create_package(db, pkg_data)
            package_map[pkg_data["name"]] = pkg

        # ── Users ───────────────────────────────────────────────────────────
        print("\n── Users ─────────────────────────────────────────────────────")
        user_map: dict[str, User] = {}
        for u in SEED_USERS:
            user = _get_or_create_user(
                db,
                name=u["name"],
                email=u["email"],
                role_id=role_map[u["role"]].id,
                phone=u["phone"],
                is_verified=u["is_verified"],
            )
            user_map[u["email"]] = user

        # ── Owner profiles & subscriptions ──────────────────────────────────
        print("\n── Owner Profiles & Subscriptions ────────────────────────────")
        owner_map: dict[str, ParkingOwner] = {}
        for email, info in OWNER_PROFILES.items():
            owner_user = user_map[email]
            owner = db.query(ParkingOwner).filter(ParkingOwner.user_id == owner_user.id).first()
            if not owner:
                owner = ParkingOwner(user_id=owner_user.id, company_name=info["company_name"])
                db.add(owner)
                db.flush()
                print(f"  [+] Owner profile: {info['company_name']} ({email})")
            else:
                print(f"  [=] Owner exists:  {info['company_name']}")
            owner_map[email] = owner

            # Subscription
            existing_sub = (
                db.query(OwnerSubscription)
                .filter(OwnerSubscription.owner_id == owner.id)
                .first()
            )
            if not existing_sub:
                pkg = package_map[info["package"]]
                now = datetime.now(timezone.utc)
                sub = OwnerSubscription(
                    owner_id=owner.id,
                    package_id=pkg.id,
                    started_at=now,
                    expires_at=now + timedelta(days=pkg.duration_days),
                    status=SubscriptionStatus.ACTIVE.value,
                    amount=pkg.price,
                )
                db.add(sub)
                db.flush()
                print(f"      [+] Subscription: {info['package']} (ACTIVE)")
            else:
                print(f"      [=] Subscription already exists")

        # ── Parking lots, floors, slots & staff ─────────────────────────────
        print("\n── Parking Lots, Floors & Slots ──────────────────────────────")
        lot_map: dict[str, ParkingLot] = {}  # name → lot
        for lot_def in PARKING_LOTS:
            owner = owner_map[lot_def["owner_email"]]
            lot = (
                db.query(ParkingLot)
                .filter(ParkingLot.owner_id == owner.id, ParkingLot.name == lot_def["name"])
                .first()
            )
            if not lot:
                lot = ParkingLot(
                    owner_id=owner.id,
                    name=lot_def["name"],
                    google_map_url=lot_def["google_map_url"],
                    type=lot_def["type"],
                    is_active=lot_def["is_active"],
                    rate_per_hour=lot_def["rate_per_hour"],
                )
                db.add(lot)
                db.flush()
                print(f"\n  [+] Lot: {lot_def['name']}  ({lot_def['type']}, {lot_def['rate_per_hour']} MMK/hr)")
                print(f"      Map: {lot_def['google_map_url']}")
            else:
                print(f"\n  [=] Lot exists: {lot_def['name']}")
            lot_map[lot_def["name"]] = lot

            total_slots = 0
            for floor_def in lot_def["floors"]:
                floor = (
                    db.query(ParkingFloor)
                    .filter(
                        ParkingFloor.parking_lot_id == lot.id,
                        ParkingFloor.floor_name == floor_def["floor_name"],
                    )
                    .first()
                )
                if not floor:
                    floor = ParkingFloor(parking_lot_id=lot.id, floor_name=floor_def["floor_name"])
                    db.add(floor)
                    db.flush()
                    print(f"      [+] Floor: {floor_def['floor_name']}")
                else:
                    print(f"      [=] Floor exists: {floor_def['floor_name']}")

                for slot_def in floor_def["slots"]:
                    existing = (
                        db.query(ParkingSlot)
                        .filter(
                            ParkingSlot.floor_id == floor.id,
                            ParkingSlot.slot_number == slot_def["slot_number"],
                        )
                        .first()
                    )
                    if not existing:
                        slot = ParkingSlot(
                            floor_id=floor.id,
                            slot_number=slot_def["slot_number"],
                            section=slot_def["section"],
                            latitude=slot_def.get("latitude"),
                            longitude=slot_def.get("longitude"),
                            status=SlotStatus.AVAILABLE.value,
                        )
                        db.add(slot)
                        total_slots += 1
                db.flush()

            if total_slots:
                print(f"      [+] {total_slots} new slots created")

            # Assign staff to this lot
            for staff_email in lot_def.get("staff_emails", []):
                staff_user = user_map.get(staff_email)
                if not staff_user:
                    print(f"      [!] Staff user not found: {staff_email}")
                    continue
                existing_staff = (
                    db.query(ParkingStaff)
                    .filter(ParkingStaff.user_id == staff_user.id)
                    .first()
                )
                if not existing_staff:
                    # created_by = the owner user
                    owner_user = user_map[lot_def["owner_email"]]
                    staff = ParkingStaff(
                        user_id=staff_user.id,
                        parking_lot_id=lot.id,
                        created_by=owner_user.id,
                    )
                    db.add(staff)
                    db.flush()
                    print(f"      [+] Staff assigned: {staff_email}")
                else:
                    print(f"      [=] Staff already assigned: {staff_email}")

        # ── Customer profiles & cars ─────────────────────────────────────────
        print("\n── Customer Profiles & Cars ──────────────────────────────────")
        for email, cars in CUSTOMER_CARS.items():
            cust_user = user_map.get(email)
            if not cust_user:
                print(f"  [!] Customer user not found: {email}")
                continue

            cust = db.query(Customer).filter(Customer.user_id == cust_user.id).first()
            if not cust:
                cust = Customer(user_id=cust_user.id)
                db.add(cust)
                db.flush()
                print(f"  [+] Customer profile: {email}")
            else:
                print(f"  [=] Customer exists:  {email}")

            for car_data in cars:
                existing_car = (
                    db.query(Car)
                    .filter(
                        Car.customer_id == cust.id,
                        Car.plate_number == car_data["plate_number"],
                    )
                    .first()
                )
                if not existing_car:
                    db.add(Car(customer_id=cust.id, **car_data))
                    print(f"      [+] Car: {car_data['plate_number']} ({car_data['brand']}, {car_data['color']})")
                else:
                    print(f"      [=] Car exists: {car_data['plate_number']}")
            db.flush()

        db.commit()

        print("\n" + "=" * 62)
        print("✅  Seeding complete!")
        print("=" * 62)
        print()
        print("  Accounts (password: asdffdsa)")
        print("  ─────────────────────────────────────────────────────────")
        print("  [ADMIN]")
        print("    khunsithu350@gmail.com")
        print()
        print("  [OWNERS]")
        print("    khunsithuaung50@gmail.com  →  KST Parking Co., Ltd.  (Pro)")
        print("    myoaung.owner@gmail.com    →  MA Parking Solutions   (Basic)")
        print("    thidawin.owner@gmail.com   →  TW Premium Parking     (Enterprise)")
        print()
        print("  [STAFF]")
        print("    khunsithu2003@gmail.com    →  Yangon Central Parking")
        print("    zawlin.staff@gmail.com     →  Sule Square Parking")
        print("    susuhtwe.staff@gmail.com   →  Junction Square Parking")
        print("    kyawkyaw.staff@gmail.com   →  Junction City Parking")
        print("    ayemyatmon.staff@gmail.com →  Bogyoke Market Parking")
        print()
        print("  [CUSTOMERS]")
        print("    khunsithuaung35@gmail.com  →  1 car (1A-1234 Toyota Silver)")
        print("    nainglin.customer@gmail.com→  2 cars (Honda White, Suzuki Red)")
        print()
        print("  Parking Lots (Yangon, Myanmar)")
        print("  ─────────────────────────────────────────────────────────")
        print("  1. Yangon Central Parking    16.7741, 96.1594  500 MMK/hr")
        print("  2. Bogyoke Market Parking    16.7821, 96.1543  600 MMK/hr")
        print("  3. Sule Square Parking       16.7769, 96.1589  800 MMK/hr")
        print("  4. Junction Square Parking   16.8315, 96.1345  700 MMK/hr")
        print("  5. Junction City Parking     16.7902, 96.1452 1000 MMK/hr")
        print("=" * 62)
        print()

    except Exception as exc:
        db.rollback()
        print(f"\n❌  Seeding failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
