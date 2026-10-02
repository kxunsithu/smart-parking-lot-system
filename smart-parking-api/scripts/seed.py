"""Seed script: creates roles, packages, users and Kayin State parking lots.

Usage (from the smart-parking-api directory):
    python -m scripts.seed          ← normal run (skips existing records)
    python -m scripts.seed --fresh  ← wipe all data first, then seed
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

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
from app.models.city import City

# ── Wipe helper ─────────────────────────────────────────────────────────────

def wipe_all(db):
    """Delete all seeded data in dependency order."""
    print("  Wiping existing data...")
    tables = [
        "parking_slots", "parking_floors", "parking_staff",
        "parking_lots", "owner_subscriptions", "parking_owners",
        "cars", "customers", "users", "packages", "roles", "cities",
    ]
    for t in tables:
        try:
            db.execute(text(f"DELETE FROM {t}"))
        except Exception:
            pass
    db.commit()
    print("  Done.\n")

# ── Roles & Packages ─────────────────────────────────────────────────────────

DEFAULT_ROLES = [
    (RoleName.ADMIN.value,    "System administrator"),
    (RoleName.OWNER.value,    "Parking lot owner"),
    (RoleName.STAFF.value,    "Parking lot staff"),
    (RoleName.CUSTOMER.value, "End customer / driver"),
]

DEFAULT_PACKAGES = [
    {
        "name": "Basic",
        "description": "Small operators — 1 lot, up to 5 staff",
        "price": 9_900.0,
        "duration_days": 30,
        "max_lots": 1,
        "max_staff": 5,
    },
    {
        "name": "Pro",
        "description": "Growing businesses — up to 3 lots, 20 staff",
        "price": 24_900.0,
        "duration_days": 30,
        "max_lots": 3,
        "max_staff": 20,
    },
    {
        "name": "Enterprise",
        "description": "Unlimited scale — up to 10 lots, unlimited staff",
        "price": 49_900.0,
        "duration_days": 30,
        "max_lots": 10,
        "max_staff": 999,
    },
]

PASSWORD = "asdffdsa"

# ── Users ────────────────────────────────────────────────────────────────────

SEED_USERS = [
    # Admin
    {"name": "System Admin",       "email": "khunsithu350@gmail.com",        "role": RoleName.ADMIN.value,    "phone": "+959000000001", "is_verified": True},

    # Owners (10 — Kayin State companies)
    {"name": "Saw Ba Thin",        "email": "sbt.Kayinpk@gmail.com",          "role": RoleName.OWNER.value,    "phone": "+959600000001", "is_verified": True},
    {"name": "Naw Paw Htoo",       "email": "nph.kayinpark@gmail.com",        "role": RoleName.OWNER.value,    "phone": "+959600000002", "is_verified": True},
    {"name": "Maung Shwe Win",     "email": "msw.hpaanparking@gmail.com",     "role": RoleName.OWNER.value,    "phone": "+959600000003", "is_verified": True},
    {"name": "Saw Lah Paw",        "email": "slp.myawaddypark@gmail.com",     "role": RoleName.OWNER.value,    "phone": "+959600000004", "is_verified": True},
    {"name": "Naw Bway Htoo",      "email": "nbh.kawkareikpark@gmail.com",    "role": RoleName.OWNER.value,    "phone": "+959600000005", "is_verified": True},
    {"name": "Saw Doh Say",        "email": "sds.smartlot@gmail.com",         "role": RoleName.OWNER.value,    "phone": "+959600000006", "is_verified": True},
    {"name": "Naw Eh Moo",         "email": "nem.kayinlot@gmail.com",         "role": RoleName.OWNER.value,    "phone": "+959600000007", "is_verified": True},
    {"name": "Maung Kler Paw",     "email": "mkp.parkingplus@gmail.com",      "role": RoleName.OWNER.value,    "phone": "+959600000008", "is_verified": True},
    {"name": "Saw Per Wah",        "email": "spw.citylot@gmail.com",          "role": RoleName.OWNER.value,    "phone": "+959600000009", "is_verified": True},
    {"name": "Naw Thaw Paw",       "email": "ntp.securelots@gmail.com",       "role": RoleName.OWNER.value,    "phone": "+959600000010", "is_verified": True},

    # Staff (12)
    {"name": "Saw Kler Htoo",      "email": "sawhklertoo.staff@gmail.com",    "role": RoleName.STAFF.value,    "phone": "+959700000001", "is_verified": True},
    {"name": "Naw Wah Paw",        "email": "nawwahpaw.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000002", "is_verified": True},
    {"name": "Maung Hser Paw",     "email": "maunghserpaw.staff@gmail.com",   "role": RoleName.STAFF.value,    "phone": "+959700000003", "is_verified": True},
    {"name": "Saw Mu Doh",         "email": "sawmudoh.staff@gmail.com",       "role": RoleName.STAFF.value,    "phone": "+959700000004", "is_verified": True},
    {"name": "Naw Bler Paw",       "email": "nawblerpaw.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000005", "is_verified": True},
    {"name": "Saw Thu Kaw",        "email": "sawthukaw.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000006", "is_verified": True},
    {"name": "Naw Eh Hser",        "email": "nawehehser.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000007", "is_verified": True},
    {"name": "Maung Kaw Htoo",     "email": "maungkawhtoo.staff@gmail.com",   "role": RoleName.STAFF.value,    "phone": "+959700000008", "is_verified": True},
    {"name": "Saw Lah Doh",        "email": "sawlahdoh.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000009", "is_verified": True},
    {"name": "Naw Paw Lay",        "email": "nawpawlay.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000010", "is_verified": True},
    {"name": "Saw Hser Gay",       "email": "sawhsergay.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000011", "is_verified": True},
    {"name": "Naw Klee Paw",       "email": "nawkleepaw.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000012", "is_verified": True},

    # Customers (15)
    {"name": "Saw Blay Htoo",      "email": "sawblayhtoo@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000001", "is_verified": True},
    {"name": "Naw Tha Blue",       "email": "nawthablue@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000002", "is_verified": True},
    {"name": "Maung Kaw Law",      "email": "maungkawlaw@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000003", "is_verified": True},
    {"name": "Saw Doh Htoo",       "email": "sawdohhtoo@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000004", "is_verified": True},
    {"name": "Naw Paw Doh",        "email": "nawpawdoh@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000005", "is_verified": True},
    {"name": "Saw Ler Paw",        "email": "sawlerpaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000006", "is_verified": True},
    {"name": "Naw Eh Khu",         "email": "nawehkhu@gmail.com",             "role": RoleName.CUSTOMER.value, "phone": "+959800000007", "is_verified": True},
    {"name": "Maung Hsa Wah",      "email": "maunghsawah@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000008", "is_verified": True},
    {"name": "Saw Paw Taw",        "email": "sawpawtaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000009", "is_verified": True},
    {"name": "Naw Khu Paw",        "email": "nawkhupaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000010", "is_verified": True},
    {"name": "Saw Hser Doh",       "email": "sawhserdoh@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000011", "is_verified": True},
    {"name": "Naw Gay Paw",        "email": "nawgaypaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000012", "is_verified": True},
    {"name": "Maung Plaw Heh",     "email": "maungplawheh@gmail.com",         "role": RoleName.CUSTOMER.value, "phone": "+959800000013", "is_verified": True},
    {"name": "Saw Kler Gay",       "email": "sawklergay@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000014", "is_verified": True},
    {"name": "Naw Wah Lay",        "email": "nawwahlay@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000015", "is_verified": True},
]

# ── Owner company profiles ────────────────────────────────────────────────────

OWNER_PROFILES = {
    "sbt.Kayinpk@gmail.com":       {"company_name": "Kayin Parking Co., Ltd.",      "package": "Pro"},
    "nph.kayinpark@gmail.com":     {"company_name": "Kayin Park Solutions",         "package": "Enterprise"},
    "msw.hpaanparking@gmail.com":  {"company_name": "Hpa-an Smart Parking",         "package": "Pro"},
    "slp.myawaddypark@gmail.com":  {"company_name": "Myawaddy Parking Services",    "package": "Enterprise"},
    "nbh.kawkareikpark@gmail.com": {"company_name": "Kawkareik Parking Hub",        "package": "Basic"},
    "sds.smartlot@gmail.com":      {"company_name": "SmartLot Kayin State",         "package": "Pro"},
    "nem.kayinlot@gmail.com":      {"company_name": "Kayin Lot Management",         "package": "Basic"},
    "mkp.parkingplus@gmail.com":   {"company_name": "Parking Plus KYN",             "package": "Pro"},
    "spw.citylot@gmail.com":       {"company_name": "City Lot Kayin",               "package": "Basic"},
    "ntp.securelots@gmail.com":    {"company_name": "Secure Lots KYN",              "package": "Basic"},
}

# ── Customer cars ─────────────────────────────────────────────────────────────

CUSTOMER_CARS = {
    "sawblayhtoo@gmail.com":   [("1A-1111", "Toyota",      "White"),  ("1A-2222", "Suzuki",  "Silver")],
    "nawthablue@gmail.com":    [("2B-3333", "Honda",       "Red")],
    "maungkawlaw@gmail.com":   [("3C-4444", "Mazda",       "Blue"),   ("3C-5555", "Toyota",  "White")],
    "sawdohhtoo@gmail.com":    [("4D-6666", "Mitsubishi",  "Black")],
    "nawpawdoh@gmail.com":     [("5E-7777", "Hyundai",     "Grey"),   ("5E-8888", "Kia",     "Silver")],
    "sawlerpaw@gmail.com":     [("6F-9999", "Toyota",      "Gold")],
    "nawehkhu@gmail.com":      [("7G-0001", "Suzuki",      "White"),  ("7G-0002", "Nissan",  "Black")],
    "maunghsawah@gmail.com":   [("8H-0003", "Honda",       "Pearl White")],
    "sawpawtaw@gmail.com":     [("9I-0004", "Toyota",      "Silver"), ("9I-0005", "Mazda",   "Blue")],
    "nawkhupaw@gmail.com":     [("0J-0006", "Mitsubishi",  "Grey")],
    "sawhserdoh@gmail.com":    [("1K-0007", "Toyota",      "White"),  ("1K-0008", "Kia",     "Red")],
    "nawgaypaw@gmail.com":     [("2L-0009", "Hyundai",     "Blue")],
    "maungplawheh@gmail.com":  [("3M-0010", "Honda",       "Black"),  ("3M-0011", "Suzuki",  "White")],
    "sawklergay@gmail.com":    [("4N-0012", "Toyota",      "Silver")],
    "nawwahlay@gmail.com":     [("5O-0013", "Nissan",      "Grey"),   ("5O-0014", "Toyota",  "Blue")],
}

# ── Parking lots — Kayin State (Kayin State) real locations ──────────────────
# GPS coordinates are real locations in Kayin State townships.

PARKING_LOTS = [

    # ── 1. Hpa-an Central Market Parking (ဖာအမ်မြို့) ──────────────────────
    {
        "owner_email": "msw.hpaanparking@gmail.com",
        "name": "Hpa-an Central Market Parking",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8893,97.6322&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": ["sawhklertoo.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.88931, "longitude": 97.63221},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.88932, "longitude": 97.63222},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.88933, "longitude": 97.63223},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.88934, "longitude": 97.63224},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.88935, "longitude": 97.63225},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.88936, "longitude": 97.63226},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.88937, "longitude": 97.63227},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.88938, "longitude": 97.63228},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.88941, "longitude": 97.63221},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.88942, "longitude": 97.63222},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.88943, "longitude": 97.63223},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.88944, "longitude": 97.63224},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.88945, "longitude": 97.63225},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.88946, "longitude": 97.63226},
                ],
            },
        ],
    },

    # ── 2. Hpa-an Township Office Parking ────────────────────────────────────
    {
        "owner_email": "sbt.Kayinpk@gmail.com",
        "name": "Hpa-an Township Office Parking",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8941,97.6291&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["nawwahpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89411, "longitude": 97.62911},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89412, "longitude": 97.62912},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89413, "longitude": 97.62913},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89414, "longitude": 97.62914},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89415, "longitude": 97.62915},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.89416, "longitude": 97.62916},
                ],
            },
        ],
    },

    # ── 3. Hpa-an Hospital Parking ────────────────────────────────────────────
    {
        "owner_email": "sbt.Kayinpk@gmail.com",
        "name": "Hpa-an General Hospital Parking",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8912,97.6348&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 300.0,
        "staff_emails": ["maunghserpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89121, "longitude": 97.63481},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89122, "longitude": 97.63482},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89123, "longitude": 97.63483},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.89124, "longitude": 97.63484},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89125, "longitude": 97.63485},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89126, "longitude": 97.63486},
                ],
            },
        ],
    },

    # ── 4. Myawaddy Border Trade Parking (မြဝတီမြို့) ───────────────────────
    {
        "owner_email": "slp.myawaddypark@gmail.com",
        "name": "Myawaddy Border Trade Parking",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.6981,98.5028&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 800.0,
        "staff_emails": ["sawmudoh.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.69811, "longitude": 98.50281},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.69812, "longitude": 98.50282},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.69813, "longitude": 98.50283},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.69814, "longitude": 98.50284},
                    {"slot_number": "G-A05", "section": "A", "latitude": 16.69815, "longitude": 98.50285},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.69816, "longitude": 98.50286},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.69817, "longitude": 98.50287},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.69818, "longitude": 98.50288},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.69819, "longitude": 98.50289},
                    {"slot_number": "G-B05", "section": "B", "latitude": 16.69820, "longitude": 98.50290},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.69821, "longitude": 98.50281},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.69822, "longitude": 98.50282},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.69823, "longitude": 98.50283},
                    {"slot_number": "L1-A04", "section": "A", "latitude": 16.69824, "longitude": 98.50284},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.69825, "longitude": 98.50285},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.69826, "longitude": 98.50286},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.69827, "longitude": 98.50287},
                    {"slot_number": "L1-B04", "section": "B", "latitude": 16.69828, "longitude": 98.50288},
                ],
            },
            {
                "floor_name": "Level 2 (L2)",
                "slots": [
                    {"slot_number": "L2-A01", "section": "A", "latitude": 16.69831, "longitude": 98.50281},
                    {"slot_number": "L2-A02", "section": "A", "latitude": 16.69832, "longitude": 98.50282},
                    {"slot_number": "L2-A03", "section": "A", "latitude": 16.69833, "longitude": 98.50283},
                    {"slot_number": "L2-B01", "section": "B", "latitude": 16.69834, "longitude": 98.50284},
                    {"slot_number": "L2-B02", "section": "B", "latitude": 16.69835, "longitude": 98.50285},
                    {"slot_number": "L2-B03", "section": "B", "latitude": 16.69836, "longitude": 98.50286},
                ],
            },
        ],
    },

    # ── 5. Myawaddy Market Parking ───────────────────────────────────────────
    {
        "owner_email": "slp.myawaddypark@gmail.com",
        "name": "Myawaddy Market Parking",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.7010,98.4995&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["nawblerpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.70101, "longitude": 98.49951},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.70102, "longitude": 98.49952},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.70103, "longitude": 98.49953},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.70104, "longitude": 98.49954},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.70105, "longitude": 98.49955},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.70106, "longitude": 98.49956},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.70107, "longitude": 98.49957},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.70108, "longitude": 98.49958},
                ],
            },
        ],
    },

    # ── 6. Kawkareik Town Centre Parking (ကော့ကရိတ်) ────────────────────────
    {
        "owner_email": "nbh.kawkareikpark@gmail.com",
        "name": "Kawkareik Town Centre Parking",
        "city": "Kawkareik",
        "google_map_url": "https://maps.google.com/maps?q=16.5420,98.2550&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["sawthukaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.54201, "longitude": 98.25501},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.54202, "longitude": 98.25502},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.54203, "longitude": 98.25503},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.54204, "longitude": 98.25504},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.54205, "longitude": 98.25505},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.54206, "longitude": 98.25506},
                ],
            },
        ],
    },

    # ── 7. Kawkareik Market Parking ──────────────────────────────────────────
    {
        "owner_email": "sds.smartlot@gmail.com",
        "name": "Kawkareik Market Parking",
        "city": "Kawkareik",
        "google_map_url": "https://maps.google.com/maps?q=16.5448,98.2581&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["nawehehser.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.54481, "longitude": 98.25811},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.54482, "longitude": 98.25812},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.54483, "longitude": 98.25813},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.54484, "longitude": 98.25814},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.54485, "longitude": 98.25815},
                ],
            },
        ],
    },

    # ── 8. Kyainseikgyi Jetty Parking (ကျိုင်းဆိုင်ကြီး) ───────────────────
    {
        "owner_email": "nph.kayinpark@gmail.com",
        "name": "Kyainseikgyi Jetty Parking",
        "city": "Kyainseikgyi",
        "google_map_url": "https://maps.google.com/maps?q=16.0985,98.1542&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 450.0,
        "staff_emails": ["maungkawhtoo.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.09851, "longitude": 98.15421},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.09852, "longitude": 98.15422},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.09853, "longitude": 98.15423},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.09854, "longitude": 98.15424},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.09855, "longitude": 98.15425},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.09856, "longitude": 98.15426},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.09857, "longitude": 98.15427},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.09858, "longitude": 98.15428},
                ],
            },
        ],
    },

    # ── 9. Kyainseikgyi Market Parking ───────────────────────────────────────
    {
        "owner_email": "nph.kayinpark@gmail.com",
        "name": "Kyainseikgyi Market Parking",
        "city": "Kyainseikgyi",
        "google_map_url": "https://maps.google.com/maps?q=16.1025,98.1601&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["sawlahdoh.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.10251, "longitude": 98.16011},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.10252, "longitude": 98.16012},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.10253, "longitude": 98.16013},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.10254, "longitude": 98.16014},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.10255, "longitude": 98.16015},
                ],
            },
        ],
    },

    # ── 10. Hlaingbwe Township Parking (လှိုင်းဘွဲ့) ────────────────────────
    {
        "owner_email": "mkp.parkingplus@gmail.com",
        "name": "Hlaingbwe Township Parking",
        "city": "Hlaingbwe",
        "google_map_url": "https://maps.google.com/maps?q=17.0821,97.5632&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 300.0,
        "staff_emails": ["nawpawlay.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 17.08211, "longitude": 97.56321},
                    {"slot_number": "G-A02", "section": "A", "latitude": 17.08212, "longitude": 97.56322},
                    {"slot_number": "G-A03", "section": "A", "latitude": 17.08213, "longitude": 97.56323},
                    {"slot_number": "G-B01", "section": "B", "latitude": 17.08214, "longitude": 97.56324},
                    {"slot_number": "G-B02", "section": "B", "latitude": 17.08215, "longitude": 97.56325},
                    {"slot_number": "G-B03", "section": "B", "latitude": 17.08216, "longitude": 97.56326},
                ],
            },
        ],
    },

    # ── 11. Papun Central Parking (ဖာပြုန်) ─────────────────────────────────
    {
        "owner_email": "nem.kayinlot@gmail.com",
        "name": "Papun Central Parking",
        "city": "Papun",
        "google_map_url": "https://maps.google.com/maps?q=18.0451,97.4532&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 300.0,
        "staff_emails": ["sawhsergay.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 18.04511, "longitude": 97.45321},
                    {"slot_number": "G-A02", "section": "A", "latitude": 18.04512, "longitude": 97.45322},
                    {"slot_number": "G-A03", "section": "A", "latitude": 18.04513, "longitude": 97.45323},
                    {"slot_number": "G-B01", "section": "B", "latitude": 18.04514, "longitude": 97.45324},
                    {"slot_number": "G-B02", "section": "B", "latitude": 18.04515, "longitude": 97.45325},
                ],
            },
        ],
    },

    # ── 12. Thandaunggyi Hill Station Parking ────────────────────────────────
    {
        "owner_email": "spw.citylot@gmail.com",
        "name": "Thandaunggyi Hill Parking",
        "city": "Thandaunggyi",
        "google_map_url": "https://maps.google.com/maps?q=18.4011,97.0210&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["nawkleepaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 18.40111, "longitude": 97.02101},
                    {"slot_number": "G-A02", "section": "A", "latitude": 18.40112, "longitude": 97.02102},
                    {"slot_number": "G-A03", "section": "A", "latitude": 18.40113, "longitude": 97.02103},
                    {"slot_number": "G-B01", "section": "B", "latitude": 18.40114, "longitude": 97.02104},
                    {"slot_number": "G-B02", "section": "B", "latitude": 18.40115, "longitude": 97.02105},
                    {"slot_number": "G-B03", "section": "B", "latitude": 18.40116, "longitude": 97.02106},
                ],
            },
        ],
    },

    # ── 13. Myawaddy SCG Industrial Parking (Private) ───────────────────────
    {
        "owner_email": "ntp.securelots@gmail.com",
        "name": "Myawaddy Industrial Zone Parking",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.7152,98.4881&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 700.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.71521, "longitude": 98.48811},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.71522, "longitude": 98.48812},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.71523, "longitude": 98.48813},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.71524, "longitude": 98.48814},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.71525, "longitude": 98.48815},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.71526, "longitude": 98.48816},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.71527, "longitude": 98.48817},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.71528, "longitude": 98.48818},
                ],
            },
        ],
    },

    # ── 14. Hpa-an Shwe Myo Daw Pagoda Parking ───────────────────────────────
    {
        "owner_email": "msw.hpaanparking@gmail.com",
        "name": "Hpa-an Shwe Myo Daw Pagoda Parking",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8801,97.6198&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 200.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.88011, "longitude": 97.61981},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.88012, "longitude": 97.61982},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.88013, "longitude": 97.61983},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.88014, "longitude": 97.61984},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.88015, "longitude": 97.61985},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.88016, "longitude": 97.61986},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.88017, "longitude": 97.61987},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.88018, "longitude": 97.61988},
                ],
            },
        ],
    },
]

CITIES_DATA = [
    {
        "name": "Hpa-an",
        "name_mm": "ဘားအံ",
        "description": "Capital city of Kayin State, famous for Mount Zwekabin, Saddar Cave, and Kyaut Ka Latt Pagoda.",
        "image_url": "/uploads/city_images/hpa_an.png",
    },
    {
        "name": "Myawaddy",
        "name_mm": "မြဝတီ",
        "description": "Major border trade hub on the Thai-Myanmar border connected to Mae Sot via the Friendship Bridge.",
        "image_url": "/uploads/city_images/myawaddy.png",
    },
    {
        "name": "Kawkareik",
        "name_mm": "ကော့ကရိတ်",
        "description": "Strategic transit city situated at the foot of the Dawna Range along the Asian Highway.",
        "image_url": None,
    },
    {
        "name": "Kyainseikgyi",
        "name_mm": "ကြာအင်းဆိပ်ကြီး",
        "description": "Southern township of Kayin State situated along the Zami and Winyaw Rivers.",
        "image_url": None,
    },
    {
        "name": "Thandaunggyi",
        "name_mm": "သံတောင်ကြီး",
        "description": "Scenic hill station town renowned for tea plantations and Naw Bu Baw Prayer Mountain.",
        "image_url": None,
    },
    {
        "name": "Papun",
        "name_mm": "ဖာပွန်",
        "description": "Northern township of Kayin State located along the Yunzalin River in Mutraw district.",
        "image_url": None,
    },
    {
        "name": "Payathonzu",
        "name_mm": "ဘုရားသုံးဆူ",
        "description": "Border town famous for the Three Pagodas Pass connecting Myanmar and Thailand.",
        "image_url": None,
    },
]


def seed():
    fresh = "--fresh" in sys.argv
    db = SessionLocal()
    try:
        if fresh:
            wipe_all(db)

        print("=" * 70)
        print("  Smart Parking — Kayin State (ကရင်ပြည်နယ်) Seed")
        print("=" * 70)

        # 1. Roles
        print("\n[1] Roles")
        role_map: dict[str, Role] = {}
        for name, desc in DEFAULT_ROLES:
            r = db.query(Role).filter_by(name=name).first()
            if not r:
                r = Role(name=name, description=desc)
                db.add(r)
                db.flush()
                print(f"  [+] Role: {name}")
            else:
                print(f"  [=] Role exists: {name}")
            role_map[name] = r

        # 2. Packages
        print("\n[2] Packages")
        pkg_map: dict[str, Package] = {}
        for p in DEFAULT_PACKAGES:
            pkg = db.query(Package).filter_by(name=p["name"]).first()
            if not pkg:
                pkg = Package(**p)
                db.add(pkg)
                db.flush()
                print(f"  [+] Package: {p['name']}")
            else:
                print(f"  [=] Package exists: {p['name']}")
            pkg_map[p["name"]] = pkg

        # 2.5 Cities
        print("\n[2.5] Cities")
        for c_data in CITIES_DATA:
            c_obj = db.query(City).filter_by(name=c_data["name"]).first()
            if not c_obj:
                c_obj = City(
                    name=c_data["name"],
                    name_mm=c_data["name_mm"],
                    description=c_data["description"],
                    image_url=c_data.get("image_url"),
                    is_active=True,
                )
                db.add(c_obj)
                db.flush()
                print(f"  [+] City: {c_data['name']} ({c_data['name_mm']})")
            else:
                if c_data.get("image_url") and not c_obj.image_url:
                    c_obj.image_url = c_data["image_url"]
                    db.flush()
                print(f"  [=] City exists: {c_data['name']}")

        # 3. Users
        print("\n[3] Users")
        hashed_pw = hash_password(PASSWORD)
        user_map: dict[str, User] = {}
        for u in SEED_USERS:
            existing = db.query(User).filter_by(email=u["email"]).first()
            if existing:
                print(f"  [=] Exists: {u['email']}")
                user_map[u["email"]] = existing
                continue
            role = role_map[u["role"]]
            user = User(
                name=u["name"],
                email=u["email"],
                phone=u["phone"],
                password=hashed_pw,
                role_id=role.id,
                is_verified=u["is_verified"],
            )
            db.add(user)
            db.flush()
            user_map[u["email"]] = user
            print(f"  [+] {u['role']:10s} {u['email']}")

        # 4. Owner profiles & subscriptions
        print("\n[4] Owner Profiles & Subscriptions")
        owner_map: dict[str, ParkingOwner] = {}
        for email, profile in OWNER_PROFILES.items():
            user = user_map.get(email)
            if not user:
                continue
            owner = db.query(ParkingOwner).filter_by(user_id=user.id).first()
            if not owner:
                owner = ParkingOwner(user_id=user.id, company_name=profile["company_name"])
                db.add(owner)
                db.flush()
                print(f"  [+] Owner: {profile['company_name']}")
            owner_map[email] = owner

            # subscription
            sub = db.query(OwnerSubscription).filter_by(owner_id=owner.id).first()
            if not sub:
                pkg = pkg_map[profile["package"]]
                now = datetime.now(timezone.utc)
                sub = OwnerSubscription(
                    owner_id=owner.id,
                    package_id=pkg.id,
                    status=SubscriptionStatus.ACTIVE.value,
                    started_at=now,
                    expires_at=now + timedelta(days=pkg.duration_days),
                )
                db.add(sub)
                db.flush()

        # 5. Customer profiles & cars
        print("\n[5] Customers & Cars")
        for email, cars in CUSTOMER_CARS.items():
            user = user_map.get(email)
            if not user:
                continue
            cust = db.query(Customer).filter_by(user_id=user.id).first()
            if not cust:
                cust = Customer(user_id=user.id)
                db.add(cust)
                db.flush()
            for plate, brand, color in cars:
                car = db.query(Car).filter_by(plate_number=plate).first()
                if not car:
                    car = Car(customer_id=cust.id, plate_number=plate, brand=brand, color=color)
                    db.add(car)
            print(f"  [+] Customer: {email} ({len(cars)} car{'s' if len(cars)>1 else ''})")

        # 6. Parking lots, floors, slots, staff
        print("\n[6] Parking Lots (Kayin State — ကရင်ပြည်နယ်)")
        for i, lot_data in enumerate(PARKING_LOTS, 1):
            owner = owner_map.get(lot_data["owner_email"])
            if not owner:
                print(f"  [!] Owner not found: {lot_data['owner_email']}")
                continue

            lot = db.query(ParkingLot).filter_by(name=lot_data["name"]).first()
            if not lot:
                lot = ParkingLot(
                    owner_id=owner.id,
                    name=lot_data["name"],
                    city=lot_data["city"],
                    google_map_url=lot_data["google_map_url"],
                    type=lot_data["type"],
                    is_active=lot_data["is_active"],
                    rate_per_hour=lot_data["rate_per_hour"],
                )
                db.add(lot)
                db.flush()

                total_slots = 0
                for fl in lot_data["floors"]:
                    floor = ParkingFloor(parking_lot_id=lot.id, floor_name=fl["floor_name"])
                    db.add(floor)
                    db.flush()
                    for s in fl["slots"]:
                        slot = ParkingSlot(
                            floor_id=floor.id,
                            slot_number=s["slot_number"],
                            section=s.get("section"),
                            latitude=s.get("latitude"),
                            longitude=s.get("longitude"),
                            status=SlotStatus.AVAILABLE.value,
                        )
                        db.add(slot)
                        total_slots += 1

                for staff_email in lot_data.get("staff_emails", []):
                    staff_user = user_map.get(staff_email)
                    if staff_user:
                        ps = ParkingStaff(user_id=staff_user.id, parking_lot_id=lot.id)
                        db.add(ps)

                print(f"  [{i:02d}] {lot_data['name']:<45} {lot_data['city']:<18} {int(lot_data['rate_per_hour'])}/hr  {total_slots} slots")
            else:
                print(f"  [=]  Exists: {lot_data['name']}")

        db.commit()

        # ── Summary ──────────────────────────────────────────────────────────
        print("\n" + "=" * 70)
        print("✅  Seeding complete!")
        print("=" * 70)
        print(f"\n  Password for all accounts: {PASSWORD}")
        print(f"\n  {'Role':<12} {'Email':<42} Notes")
        print("  " + "─" * 66)
        print(f"  {'ADMIN':<12} khunsithu350@gmail.com")
        print()
        print("  OWNERS:")
        for email, p in OWNER_PROFILES.items():
            print(f"    {email:<42}  {p['company_name']}  [{p['package']}]")
        print()
        print("  STAFF:")
        staff_list = [u for u in SEED_USERS if u["role"] == RoleName.STAFF.value]
        for u in staff_list:
            print(f"    {u['email']}")
        print()
        print("  CUSTOMERS:")
        for email, cars in CUSTOMER_CARS.items():
            car_str = ", ".join(f"{b} {c}" for _, b, c in cars)
            print(f"    {email:<42}  {car_str}")
        print()
        print("  PARKING LOTS (Kayin State / ကရင်ပြည်နယ်):")
        for i, lot in enumerate(PARKING_LOTS, 1):
            print(f"    {i:02d}. [{lot['city']:<18}] {lot['name']}")
        print("=" * 70 + "\n")

    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed()
