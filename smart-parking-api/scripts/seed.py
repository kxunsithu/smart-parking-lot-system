"""Seed script: creates roles, packages, users, cities, parking lots, sessions, wallet accounts, and transactions.

Usage (from the smart-parking-api directory):
    venv/bin/python -m scripts.seed          ← normal run (skips existing records)
    venv/bin/python -m scripts.seed --fresh  ← wipe all data first, then seed
"""
import sys
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.config.settings import settings
from app.core.constants import LotType, PaymentStatus, RoleName, SessionStatus, SlotStatus, SubscriptionStatus
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.car import Car
from app.models.city import City
from app.models.customer import Customer
from app.models.owner_subscription import OwnerSubscription
from app.models.package import Package
from app.models.parking_floor import ParkingFloor
from app.models.parking_lot import ParkingLot
from app.models.parking_owner import ParkingOwner
from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.parking_staff import ParkingStaff
from app.models.payment import Payment
from app.models.role import Role
from app.models.user import User
from app.models.wallet_account import WalletAccount


# ── Wipe helper ─────────────────────────────────────────────────────────────

def wipe_all(db):
    """Delete all seeded data in dependency order."""
    print("  Wiping existing data...")
    tables = [
        "payments", "parking_sessions", "wallet_accounts",
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

PASSWORD = "Parking2026@"

# ── Users ────────────────────────────────────────────────────────────────────

SEED_USERS = [
    # Admin
    {"name": "System Admin",           "email": "khunsithu350@gmail.com",        "role": RoleName.ADMIN.value,    "phone": "+959000000001", "is_verified": True},

    # Owners (12 — Real corporate/banking office and parking company accounts)
    {"name": "KBZ Banking Office",     "email": "kbz.bankingoffice@gmail.com",   "role": RoleName.OWNER.value,    "phone": "+959600000001", "is_verified": True},
    {"name": "AYA Bank Hpa-an",         "email": "ayabank.hpaan@gmail.com",       "role": RoleName.OWNER.value,    "phone": "+959600000002", "is_verified": True},
    {"name": "CB Bank Myawaddy",       "email": "cbbank.myawaddy@gmail.com",     "role": RoleName.OWNER.value,    "phone": "+959600000003", "is_verified": True},
    {"name": "Yoma Bank Kayin",        "email": "yomabank.kayin@gmail.com",      "role": RoleName.OWNER.value,    "phone": "+959600000004", "is_verified": True},
    {"name": "Wave Money Center",      "email": "wavemoney.center@gmail.com",    "role": RoleName.OWNER.value,    "phone": "+959600000005", "is_verified": True},
    {"name": "Max Myanmar Group",      "email": "maxmyanmar.group@gmail.com",    "role": RoleName.OWNER.value,    "phone": "+959600000006", "is_verified": True},
    {"name": "Denko Trading Kayin",    "email": "denko.trading@gmail.com",       "role": RoleName.OWNER.value,    "phone": "+959600000007", "is_verified": True},
    {"name": "Shwe Taung Real Estate", "email": "shwetaung.realestate@gmail.com", "role": RoleName.OWNER.value,    "phone": "+959600000008", "is_verified": True},
    {"name": "Grand Royal Group",      "email": "grandroyal.group@gmail.com",    "role": RoleName.OWNER.value,    "phone": "+959600000009", "is_verified": True},
    {"name": "City Mart Holding",      "email": "citymart.holding@gmail.com",    "role": RoleName.OWNER.value,    "phone": "+959600000010", "is_verified": True},
    {"name": "Kayin Smart Parking",    "email": "kayin.smartparking@gmail.com",  "role": RoleName.OWNER.value,    "phone": "+959600000011", "is_verified": True},
    {"name": "Hpa An Smart Parking",   "email": "hpaan.smartparking@gmail.com",  "role": RoleName.OWNER.value,    "phone": "+959600000012", "is_verified": True},

    # Staff (12)
    {"name": "Saw Kler Htoo",          "email": "sawhklertoo.staff@gmail.com",    "role": RoleName.STAFF.value,    "phone": "+959700000001", "is_verified": True},
    {"name": "Naw Wah Paw",            "email": "nawwahpaw.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000002", "is_verified": True},
    {"name": "Maung Hser Paw",         "email": "maunghserpaw.staff@gmail.com",   "role": RoleName.STAFF.value,    "phone": "+959700000003", "is_verified": True},
    {"name": "Saw Mu Doh",             "email": "sawmudoh.staff@gmail.com",       "role": RoleName.STAFF.value,    "phone": "+959700000004", "is_verified": True},
    {"name": "Naw Bler Paw",           "email": "nawblerpaw.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000005", "is_verified": True},
    {"name": "Saw Thu Kaw",            "email": "sawthukaw.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000006", "is_verified": True},
    {"name": "Naw Eh Hser",            "email": "nawehehser.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000007", "is_verified": True},
    {"name": "Maung Kaw Htoo",         "email": "maungkawhtoo.staff@gmail.com",   "role": RoleName.STAFF.value,    "phone": "+959700000008", "is_verified": True},
    {"name": "Saw Lah Doh",            "email": "sawlahdoh.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000009", "is_verified": True},
    {"name": "Naw Paw Lay",            "email": "nawpawlay.staff@gmail.com",      "role": RoleName.STAFF.value,    "phone": "+959700000010", "is_verified": True},
    {"name": "Saw Hser Gay",           "email": "sawhsergay.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000011", "is_verified": True},
    {"name": "Naw Klee Paw",           "email": "nawkleepaw.staff@gmail.com",     "role": RoleName.STAFF.value,    "phone": "+959700000012", "is_verified": True},
    {"name": "Saw Kyaw Swar",          "email": "sawkyawswar.staff@gmail.com",    "role": RoleName.STAFF.value,    "phone": "+959700000013", "is_verified": True},
    {"name": "Naw Mu Eh",              "email": "nawmueh.staff@gmail.com",        "role": RoleName.STAFF.value,    "phone": "+959700000014", "is_verified": True},

    # Customers (15)
    {"name": "Saw Blay Htoo",          "email": "sawblayhtoo@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000001", "is_verified": True},
    {"name": "Naw Tha Blue",           "email": "nawthablue@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000002", "is_verified": True},
    {"name": "Maung Kaw Law",          "email": "maungkawlaw@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000003", "is_verified": True},
    {"name": "Saw Doh Htoo",           "email": "sawdohhtoo@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000004", "is_verified": True},
    {"name": "Naw Paw Doh",            "email": "nawpawdoh@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000005", "is_verified": True},
    {"name": "Saw Ler Paw",            "email": "sawlerpaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000006", "is_verified": True},
    {"name": "Naw Eh Khu",             "email": "nawehkhu@gmail.com",             "role": RoleName.CUSTOMER.value, "phone": "+959800000007", "is_verified": True},
    {"name": "Maung Hsa Wah",          "email": "maunghsawah@gmail.com",          "role": RoleName.CUSTOMER.value, "phone": "+959800000008", "is_verified": True},
    {"name": "Saw Paw Taw",            "email": "sawpawtaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000009", "is_verified": True},
    {"name": "Naw Khu Paw",            "email": "nawkhupaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000010", "is_verified": True},
    {"name": "Saw Hser Doh",           "email": "sawhserdoh@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000011", "is_verified": True},
    {"name": "Naw Gay Paw",            "email": "nawgaypaw@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000012", "is_verified": True},
    {"name": "Maung Plaw Heh",         "email": "maungplawheh@gmail.com",         "role": RoleName.CUSTOMER.value, "phone": "+959800000013", "is_verified": True},
    {"name": "Saw Kler Gay",           "email": "sawklergay@gmail.com",           "role": RoleName.CUSTOMER.value, "phone": "+959800000014", "is_verified": True},
    {"name": "Naw Wah Lay",            "email": "nawwahlay@gmail.com",            "role": RoleName.CUSTOMER.value, "phone": "+959800000015", "is_verified": True},
    {"name": "Khun Si Thu",            "email": "khunsithu2003@gmail.com",        "role": RoleName.CUSTOMER.value, "phone": "+959800000016", "is_verified": True},
]

# ── Owner company profiles ────────────────────────────────────────────────────

OWNER_PROFILES = {
    "kbz.bankingoffice@gmail.com":    {"company_name": "KBZ Banking Office",      "package": "Pro"},
    "ayabank.hpaan@gmail.com":        {"company_name": "AYA Bank Hpa-an",          "package": "Enterprise"},
    "cbbank.myawaddy@gmail.com":      {"company_name": "CB Bank Myawaddy",        "package": "Pro"},
    "yomabank.kayin@gmail.com":       {"company_name": "Yoma Bank Kayin",         "package": "Enterprise"},
    "wavemoney.center@gmail.com":     {"company_name": "Wave Money Center",       "package": "Basic"},
    "maxmyanmar.group@gmail.com":     {"company_name": "Max Myanmar Group",       "package": "Pro"},
    "denko.trading@gmail.com":        {"company_name": "Denko Trading Kayin",     "package": "Basic"},
    "shwetaung.realestate@gmail.com": {"company_name": "Shwe Taung Real Estate", "package": "Pro"},
    "grandroyal.group@gmail.com":     {"company_name": "Grand Royal Group",       "package": "Basic"},
    "citymart.holding@gmail.com":     {"company_name": "City Mart Holding",       "package": "Basic"},
    "kayin.smartparking@gmail.com":   {"company_name": "Kayin Smart Parking",     "package": "Enterprise"},
    "hpaan.smartparking@gmail.com":   {"company_name": "Hpa An Smart Parking",    "package": "Pro"},
}

# ── Customer cars ─────────────────────────────────────────────────────────────

CUSTOMER_CARS = {
    "sawblayhtoo@gmail.com":   [("YGN 1A-1111", "Toyota",      "White"),  ("YGN 1A-2222", "Suzuki",  "Silver")],
    "nawthablue@gmail.com":    [("YGN 2B-3333", "Honda",       "Red")],
    "maungkawlaw@gmail.com":   [("YGN 3C-4444", "Mazda",       "Blue"),   ("YGN 3C-5555", "Toyota",  "White")],
    "sawdohhtoo@gmail.com":    [("YGN 4D-6666", "Mitsubishi",  "Black")],
    "nawpawdoh@gmail.com":     [("YGN 5E-7777", "Hyundai",     "Grey"),   ("YGN 5E-8888", "Kia",     "Silver")],
    "sawlerpaw@gmail.com":     [("YGN 6F-9999", "Toyota",      "Gold")],
    "nawehkhu@gmail.com":      [("KYN 7G-0001", "Suzuki",      "White"),  ("KYN 7G-0002", "Nissan",  "Black")],
    "maunghsawah@gmail.com":   [("MDY 8H-0003", "Honda",       "Pearl White")],
    "sawpawtaw@gmail.com":     [("NPT 9I-0004", "Toyota",      "Silver"), ("NPT 9I-0005", "Mazda",   "Blue")],
    "nawkhupaw@gmail.com":     [("KYN 0J-0006", "Mitsubishi",  "Grey")],
    "sawhserdoh@gmail.com":    [("KYN 1K-0007", "Toyota",      "White"),  ("KYN 1K-0008", "Kia",     "Red")],
    "nawgaypaw@gmail.com":     [("KYN 2L-0009", "Hyundai",     "Blue")],
    "maungplawheh@gmail.com":  [("KYN 3M-0010", "Honda",       "Black"),  ("KYN 3M-0011", "Suzuki",  "White")],
    "sawklergay@gmail.com":    [("KYN 4N-0012", "Toyota",      "Silver")],
    "nawwahlay@gmail.com":     [("KYN 5O-0013", "Nissan",      "Grey"),   ("KYN 5O-0014", "Toyota",  "Blue")],
    "khunsithu2003@gmail.com": [("KYN 2A-3456", "Toyota",  "Black"), ("KYN 1B-6789", "Suzuki",  "Red"), ("YGN 3C-1234", "Honda", "Blue"),],
}

# ── Cities — ONLY Hlaingbwe, Hpa-an, Kawkareik, Kyainseikgyi, Myawaddy, Payathonzu ──

CITIES_DATA = [
    {
        "name": "Hlaingbwe",
        "name_mm": "လှိုင်းဘွဲ့",
        "description": "Central township of Kayin State known for agricultural communities.",
        "image_url": "/uploads/city_images/hlaingbwe.webp",
    },
    {
        "name": "Hpa-an",
        "name_mm": "ဘားအံ",
        "description": "Capital city of Kayin State, famous for Mount Zwekabin, Saddar Cave, and Kyaut Ka Latt Pagoda.",
        "image_url": "/uploads/city_images/hpa_an.jpg",
    },
    {
        "name": "Kawkareik",
        "name_mm": "ကော့ကရိတ်",
        "description": "Strategic transit city situated at the foot of the Dawna Range along the Asian Highway.",
        "image_url": "/uploads/city_images/kawkareik.jpg",
    },
    {
        "name": "Kyainseikgyi",
        "name_mm": "ကြာအင်းဆိပ်ကြီး",
        "description": "Southern township of Kayin State situated along the Zami and Winyaw Rivers.",
        "image_url": "/uploads/city_images/kyainseikgyi.jpg",
    },
    {
        "name": "Myawaddy",
        "name_mm": "မြဝတီ",
        "description": "Major border trade hub on the Thai-Myanmar border connected to Mae Sot via the Friendship Bridge.",
        "image_url": "/uploads/city_images/myawaddy.jpg",
    },
    {
        "name": "Payathonzu",
        "name_mm": "ဘုရားသုံးဆူ",
        "description": "Border town famous for the Three Pagodas Pass connecting Myanmar and Thailand.",
        "image_url": "/uploads/city_images/payathonzu.jpg",
    },
]

# ── Parking lots — mapped strictly to the 6 allowed cities ──────────────────

PARKING_LOTS = [
    # ── 1. Hpa-an Central Market Parking ─────────────────────────────────────
    {
        "owner_email": "hpaan.smartparking@gmail.com",
        "name": "ဘားအံဈေးကြီး ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8916004,97.6349558&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": ["sawhklertoo.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89161, "longitude": 97.63497},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89162, "longitude": 97.63498},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89163, "longitude": 97.63499},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.89164, "longitude": 97.63500},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89165, "longitude": 97.63501},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89166, "longitude": 97.63502},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.89167, "longitude": 97.63503},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.89168, "longitude": 97.63504},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.89171, "longitude": 97.63497},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.89172, "longitude": 97.63498},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.89173, "longitude": 97.63499},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.89174, "longitude": 97.63500},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.89175, "longitude": 97.63501},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.89176, "longitude": 97.63502},
                ],
            },
        ],
    },

    # ── 2. Hpa-an Township Office Parking ────────────────────────────────────
    {
        "owner_email": "kbz.bankingoffice@gmail.com",
        "name": "ဘားအံမြို့နယ်ရုံး ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.890556,97.633333&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["nawwahpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89057, "longitude": 97.63334},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89058, "longitude": 97.63335},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89059, "longitude": 97.63336},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89060, "longitude": 97.63337},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89061, "longitude": 97.63338},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.89062, "longitude": 97.63339},
                ],
            },
        ],
    },

    # ── 3. Hpa-an General Hospital Parking ───────────────────────────────────
    {
        "owner_email": "kbz.bankingoffice@gmail.com",
        "name": "ဘားအံပြည်သူ့ဆေးရုံကြီး ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.882569,97.635904&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 300.0,
        "staff_emails": ["maunghserpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.88258, "longitude": 97.63591},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.88259, "longitude": 97.63592},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.88260, "longitude": 97.63593},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.88261, "longitude": 97.63594},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.88262, "longitude": 97.63595},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.88263, "longitude": 97.63596},
                ],
            },
        ],
    },

    # ── 4. Myawaddy Border Trade Parking ────────────────────────────────────
    {
        "owner_email": "yomabank.kayin@gmail.com",
        "name": "မြဝတီနယ်စပ်ကုန်သွယ်ရေး ယာဉ်ရပ်နားစခန်း",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.691700,98.509800&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 800.0,
        "staff_emails": ["sawmudoh.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.69171, "longitude": 98.50981},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.69172, "longitude": 98.50982},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.69173, "longitude": 98.50983},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.69174, "longitude": 98.50984},
                    {"slot_number": "G-A05", "section": "A", "latitude": 16.69175, "longitude": 98.50985},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.69176, "longitude": 98.50986},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.69177, "longitude": 98.50987},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.69178, "longitude": 98.50988},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.69179, "longitude": 98.50989},
                    {"slot_number": "G-B05", "section": "B", "latitude": 16.69180, "longitude": 98.50990},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.69181, "longitude": 98.50981},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.69182, "longitude": 98.50982},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.69183, "longitude": 98.50983},
                    {"slot_number": "L1-A04", "section": "A", "latitude": 16.69184, "longitude": 98.50984},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.69185, "longitude": 98.50985},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.69186, "longitude": 98.50986},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.69187, "longitude": 98.50987},
                    {"slot_number": "L1-B04", "section": "B", "latitude": 16.69188, "longitude": 98.50988},
                ],
            },
        ],
    },

    # ── 5. Myawaddy Market Parking ───────────────────────────────────────────
    {
        "owner_email": "yomabank.kayin@gmail.com",
        "name": "မြဝတီဈေး ယာဉ်ရပ်နားစခန်း",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.6968331,98.5055148&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["nawblerpaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.69684, "longitude": 98.50552},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.69685, "longitude": 98.50553},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.69686, "longitude": 98.50554},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.69687, "longitude": 98.50555},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.69688, "longitude": 98.50556},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.69689, "longitude": 98.50557},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.69690, "longitude": 98.50558},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.69691, "longitude": 98.50559},
                ],
            },
        ],
    },

    # ── 6. Kawkareik Town Centre Parking ─────────────────────────────────────
    {
        "owner_email": "wavemoney.center@gmail.com",
        "name": "ကော့ကရိတ်မြို့လယ် ယာဉ်ရပ်နားစခန်း",
        "city": "Kawkareik",
        "google_map_url": "https://maps.google.com/maps?q=16.555531,98.239960&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["sawthukaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.55554, "longitude": 98.23997},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.55555, "longitude": 98.23998},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.55556, "longitude": 98.23999},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.55557, "longitude": 98.24000},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.55558, "longitude": 98.24001},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.55559, "longitude": 98.24002},
                ],
            },
        ],
    },

    # ── 7. Kawkareik Market Parking ──────────────────────────────────────────
    {
        "owner_email": "maxmyanmar.group@gmail.com",
        "name": "ကော့ကရိတ်ဈေး ယာဉ်ရပ်နားစခန်း",
        "city": "Kawkareik",
        "google_map_url": "https://maps.google.com/maps?q=16.554200,98.243500&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["nawehehser.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.55421, "longitude": 98.24351},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.55422, "longitude": 98.24352},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.55423, "longitude": 98.24353},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.55424, "longitude": 98.24354},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.55425, "longitude": 98.24355},
                ],
            },
        ],
    },

    # ── 8. Kyainseikgyi Jetty Parking ────────────────────────────────────────
    {
        "owner_email": "ayabank.hpaan@gmail.com",
        "name": "ကြာအင်းဆိပ်ကြီးဆိပ်ကမ်း ယာဉ်ရပ်နားစခန်း",
        "city": "Kyainseikgyi",
        "google_map_url": "https://maps.google.com/maps?q=16.041500,98.103000&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 450.0,
        "staff_emails": ["maungkawhtoo.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.04151, "longitude": 98.10301},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.04152, "longitude": 98.10302},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.04153, "longitude": 98.10303},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.04154, "longitude": 98.10304},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.04155, "longitude": 98.10305},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.04156, "longitude": 98.10306},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.04157, "longitude": 98.10307},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.04158, "longitude": 98.10308},
                ],
            },
        ],
    },

    # ── 9. Kyainseikgyi Market Parking ───────────────────────────────────────
    {
        "owner_email": "ayabank.hpaan@gmail.com",
        "name": "ကြာအင်းဆိပ်ကြီးဈေး ယာဉ်ရပ်နားစခန်း",
        "city": "Kyainseikgyi",
        "google_map_url": "https://maps.google.com/maps?q=16.0420027,98.1204781&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["sawlahdoh.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.04201, "longitude": 98.12049},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.04202, "longitude": 98.12050},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.04203, "longitude": 98.12051},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.04204, "longitude": 98.12052},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.04205, "longitude": 98.12053},
                ],
            },
        ],
    },

    # ── 10. Hlaingbwe Township Parking ──────────────────────────────────────
    {
        "owner_email": "shwetaung.realestate@gmail.com",
        "name": "လှိုင်းဘွဲ့မြို့နယ် ယာဉ်ရပ်နားစခန်း",
        "city": "Hlaingbwe",
        "google_map_url": "https://maps.google.com/maps?q=17.1262648,97.8145321&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 300.0,
        "staff_emails": ["nawpawlay.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 17.12627, "longitude": 97.81454},
                    {"slot_number": "G-A02", "section": "A", "latitude": 17.12628, "longitude": 97.81455},
                    {"slot_number": "G-A03", "section": "A", "latitude": 17.12629, "longitude": 97.81456},
                    {"slot_number": "G-B01", "section": "B", "latitude": 17.12630, "longitude": 97.81457},
                    {"slot_number": "G-B02", "section": "B", "latitude": 17.12631, "longitude": 97.81458},
                    {"slot_number": "G-B03", "section": "B", "latitude": 17.12632, "longitude": 97.81459},
                ],
            },
        ],
    },

    # ── 11. Payathonzu Border Market Parking ─────────────────────────────────
    {
        "owner_email": "denko.trading@gmail.com",
        "name": "ဘုရားသုံးဆူနယ်စပ်ဈေး ယာဉ်ရပ်နားစခန်း",
        "city": "Payathonzu",
        "google_map_url": "https://maps.google.com/maps?q=15.301500,98.384500&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["sawhsergay.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 15.30151, "longitude": 98.38451},
                    {"slot_number": "G-A02", "section": "A", "latitude": 15.30152, "longitude": 98.38452},
                    {"slot_number": "G-A03", "section": "A", "latitude": 15.30153, "longitude": 98.38453},
                    {"slot_number": "G-B01", "section": "B", "latitude": 15.30154, "longitude": 98.38454},
                    {"slot_number": "G-B02", "section": "B", "latitude": 15.30155, "longitude": 98.38455},
                ],
            },
        ],
    },

    # ── 12. Payathonzu Town Centre Parking ───────────────────────────────────
    {
        "owner_email": "grandroyal.group@gmail.com",
        "name": "ဘုရားသုံးဆူမြို့လယ် ယာဉ်ရပ်နားစခန်း",
        "city": "Payathonzu",
        "google_map_url": "https://maps.google.com/maps?q=15.3040495,98.3818582&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["nawkleepaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 15.30406, "longitude": 98.38187},
                    {"slot_number": "G-A02", "section": "A", "latitude": 15.30407, "longitude": 98.38188},
                    {"slot_number": "G-A03", "section": "A", "latitude": 15.30408, "longitude": 98.38189},
                    {"slot_number": "G-B01", "section": "B", "latitude": 15.30409, "longitude": 98.38190},
                    {"slot_number": "G-B02", "section": "B", "latitude": 15.30410, "longitude": 98.38191},
                    {"slot_number": "G-B03", "section": "B", "latitude": 15.30411, "longitude": 98.38192},
                ],
            },
        ],
    },

    # ── 13. Myawaddy Industrial Zone Parking ─────────────────────────────────
    {
        "owner_email": "citymart.holding@gmail.com",
        "name": "မြဝတီစက်မှုဇုန် ယာဉ်ရပ်နားစခန်း",
        "city": "Myawaddy",
        "google_map_url": "https://maps.google.com/maps?q=16.7025407,98.4921896&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 700.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.70255, "longitude": 98.49220},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.70256, "longitude": 98.49221},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.70257, "longitude": 98.49222},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.70258, "longitude": 98.49223},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.70259, "longitude": 98.49224},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.70260, "longitude": 98.49225},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.70261, "longitude": 98.49226},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.70262, "longitude": 98.49227},
                ],
            },
        ],
    },

    # ── 14. Hpa-an Shwe Myo Daw Pagoda Parking ───────────────────────────────
    {
        "owner_email": "kayin.smartparking@gmail.com",
        "name": "ရွှေယဉ်မျှော်ဘုရား ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.8939438,97.6311569&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 200.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89395, "longitude": 97.63117},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89396, "longitude": 97.63118},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89397, "longitude": 97.63119},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89398, "longitude": 97.63120},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89399, "longitude": 97.63121},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.89400, "longitude": 97.63122},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.89401, "longitude": 97.63123},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.89402, "longitude": 97.63124},
                ],
            },
        ],
    },

    # ── 15. Hpa-an Zwekabin Clock Tower Parking ──────────────────────────────
    {
        "owner_email": "hpaan.smartparking@gmail.com",
        "name": "ဇွဲကပင် နာရီစင် ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.890000,97.632000&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": ["sawkyawswar.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89001, "longitude": 97.63201},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89002, "longitude": 97.63202},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89003, "longitude": 97.63203},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89004, "longitude": 97.63204},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89005, "longitude": 97.63205},
                ],
            },
        ],
    },

    # ── 16. Hpa-an Thanlwin Bridge Plaza Parking ─────────────────────────────
    {
        "owner_email": "hpaan.smartparking@gmail.com",
        "name": "သံလွင်တံတား ယာဉ်ရပ်နားစခန်း",
        "city": "Hpa-an",
        "google_map_url": "https://maps.google.com/maps?q=16.895000,97.625000&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["nawmueh.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.89501, "longitude": 97.62501},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.89502, "longitude": 97.62502},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.89503, "longitude": 97.62503},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.89504, "longitude": 97.62504},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.89505, "longitude": 97.62505},
                ],
            },
        ],
    },
]


def seed():
    fresh = "--fresh" in sys.argv
    db = SessionLocal()
    try:
        if fresh:
            wipe_all(db)

        print("=" * 70)
        print("  Smart Parking — Kayin State Seed")
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

        # 2.5 Cities (Only 6 cities)
        print("\n[2.5] Cities")
        for c_data in CITIES_DATA:
            seed_image_url = c_data.get("image_url")

            c_obj = db.query(City).filter_by(name=c_data["name"]).first()
            if not c_obj:
                c_obj = City(
                    name=c_data["name"],
                    name_mm=c_data["name_mm"],
                    description=c_data["description"],
                    image_url=seed_image_url,
                    is_active=True,
                )
                db.add(c_obj)
                db.flush()
                print(f"  [+] City: {c_data['name']} ({c_data['name_mm']})" +
                      (f" — image: {seed_image_url}" if seed_image_url else " — no image"))
            else:
                # Always sync image_url from seed data (fixes null/stale values)
                if c_obj.image_url != seed_image_url:
                    c_obj.image_url = seed_image_url
                    db.flush()
                    print(f"  [~] City updated image_url: {c_data['name']} → {seed_image_url}")
                else:
                    print(f"  [=] City exists: {c_data['name']}")

        # 3. Users (Password: Admin2026@ for all users)
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

        # 4. Wallet Accounts (Admin platform wallet & Owner wallet accounts)
        print("\n[4] Wallet Accounts")
        admin_user = user_map["khunsithu350@gmail.com"]
        admin_wallet = db.query(WalletAccount).filter_by(owner_id=None).first()
        if not admin_wallet:
            admin_wallet = WalletAccount(
                owner_id=None,
                name="System Admin Platform Account",
                wallet_phone=admin_user.phone,
                api_key="admin_platform_wallet_api_key_secret",
                is_active=True,
            )
            db.add(admin_wallet)
            db.flush()
            print("  [+] Admin Platform Wallet Account created")
        else:
            print("  [=] Admin Platform Wallet Account exists")

        # 5. Owner profiles, subscriptions, owner wallet accounts & subscription payments
        print("\n[5] Owner Profiles, Wallet Accounts & Subscriptions")
        owner_map: dict[str, ParkingOwner] = {}
        owner_wallet_map: dict[int, WalletAccount] = {}
        now = datetime.now(timezone.utc)

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

            # Owner Wallet Account
            owner_wallet = db.query(WalletAccount).filter_by(owner_id=owner.id).first()
            if not owner_wallet:
                wallet_slug = email.split("@")[0].replace(".", "_")
                owner_wallet = WalletAccount(
                    owner_id=owner.id,
                    name=f"{profile['company_name']} Wallet Account",
                    wallet_phone=user.phone,
                    api_key=f"{wallet_slug}_wallet_api_key_secret",
                    is_active=True,
                )
                db.add(owner_wallet)
                db.flush()
            owner_wallet_map[owner.id] = owner_wallet

            # Subscription & matching payment
            sub = db.query(OwnerSubscription).filter_by(owner_id=owner.id).first()
            if not sub:
                pkg = pkg_map[profile["package"]]
                started_at = now - timedelta(days=15)
                expires_at = now + timedelta(days=pkg.duration_days - 15)
                sub = OwnerSubscription(
                    owner_id=owner.id,
                    package_id=pkg.id,
                    status=SubscriptionStatus.ACTIVE.value,
                    amount=pkg.price,
                    started_at=started_at,
                    expires_at=expires_at,
                )
                db.add(sub)
                db.flush()

                # Matching Payment for subscription (Owner -> Platform Admin)
                sub_payment = Payment(
                    user_id=user.id,
                    wallet_account_id=admin_wallet.id,
                    subscription_id=sub.id,
                    session_id=None,
                    reference=f"PP-SUB-{sub.id:06d}",
                    wallet_payment_reference=f"PAY-WAL-SUB-{sub.id:06d}",
                    wallet_transaction_number=f"TX-WAL-SUB-{sub.id:06d}",
                    receiver_phone=admin_wallet.wallet_phone,
                    amount=pkg.price,
                    fee=0.0,
                    total=pkg.price,
                    status=PaymentStatus.COMPLETED.value,
                    message=f"{pkg.name} package subscription payment successful",
                    paid_at=started_at,
                )
                db.add(sub_payment)

        # 6. Customer profiles & cars
        print("\n[6] Customers & Cars")
        customer_car_objs: list[Car] = []
        customer_user_map: dict[int, User] = {}  # car.id -> customer user
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
                    db.flush()
                customer_car_objs.append(car)
                customer_user_map[car.id] = user
            print(f"  [+] Customer: {email} ({len(cars)} car{'s' if len(cars)>1 else ''})")

        # 7. Parking lots, floors, slots, staff
        print("\n[7] Parking Lots, Floors, Slots & Staff")
        all_created_slots: list[tuple[ParkingSlot, ParkingLot, ParkingOwner]] = []

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
                        db.flush()
                        total_slots += 1
                        all_created_slots.append((slot, lot, owner))

                for staff_email in lot_data.get("staff_emails", []):
                    staff_user = user_map.get(staff_email)
                    if staff_user:
                        existing_ps = db.query(ParkingStaff).filter_by(user_id=staff_user.id).first()
                        if not existing_ps:
                            ps = ParkingStaff(user_id=staff_user.id, parking_lot_id=lot.id)
                            db.add(ps)

                print(f"  [{i:02d}] {lot_data['name']:<42} {lot_data['city']:<15} {int(lot_data['rate_per_hour'])}/hr  {total_slots} slots")
            else:
                print(f"  [=]  Exists: {lot_data['name']}")
                # populate existing slots for session creation
                for floor in lot.floors:
                    for slot in floor.slots:
                        all_created_slots.append((slot, lot, owner))

        # 8. Parking Sessions & Matching Transactions (Payments)
        print("\n[8] Parking Sessions & Transactions (Matching Subscriptions & Sessions)")
        existing_sessions_count = db.query(ParkingSession).count()
        if existing_sessions_count == 0 and customer_car_objs and all_created_slots:
            session_car_objs = [c for c in customer_car_objs if customer_user_map[c.id].email != "khunsithu2003@gmail.com"]
            finished_session_configs = [
                # (days_ago, duration_mins)
                (7, 120), (6, 180), (6, 60), (5, 240), (5, 90),
                (4, 150), (4, 45),  (3, 120), (3, 300), (2, 60),
                (2, 180), (1, 90),  (1, 120), (1, 210), (1, 60),
            ]

            session_idx = 1
            # A) Seed Finished Sessions & Completed Payments
            for idx, (days_ago, duration_mins) in enumerate(finished_session_configs):
                car = session_car_objs[idx % len(session_car_objs)]
                user = customer_user_map[car.id]
                slot, lot, owner = all_created_slots[idx % len(all_created_slots)]
                owner_wallet = owner_wallet_map.get(owner.id)

                start_time = now - timedelta(days=days_ago, hours=random.randint(1, 8))
                end_time = start_time + timedelta(minutes=duration_mins)
                fee = round(duration_mins * (lot.rate_per_hour / 60.0), 2)

                session = ParkingSession(
                    car_id=car.id,
                    slot_id=slot.id,
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration_mins,
                    fee=fee,
                    status=SessionStatus.FINISHED.value,
                )
                db.add(session)
                db.flush()

                # Completed payment linked to session & owner wallet
                payment = Payment(
                    user_id=user.id,
                    wallet_account_id=owner_wallet.id if owner_wallet else None,
                    session_id=session.id,
                    subscription_id=None,
                    reference=f"PP-SES-{session.id:06d}",
                    wallet_payment_reference=f"PAY-WAL-SES-{session.id:06d}",
                    wallet_transaction_number=f"TX-WAL-SES-{session.id:06d}",
                    receiver_phone=owner_wallet.wallet_phone if owner_wallet else None,
                    amount=fee,
                    fee=0.0,
                    total=fee,
                    status=PaymentStatus.COMPLETED.value,
                    message=f"Parking session payment for slot {slot.slot_number} successful",
                    paid_at=end_time,
                )
                db.add(payment)
                session_idx += 1

            # B) Seed Active Sessions (Ongoing)
            active_slot_indices = [3, 7, 12, 18, 22]
            for slot_i in active_slot_indices:
                if slot_i < len(all_created_slots):
                    slot, lot, owner = all_created_slots[slot_i]
                    car = session_car_objs[(slot_i + 5) % len(session_car_objs)]

                    start_time = now - timedelta(minutes=random.randint(15, 90))
                    session = ParkingSession(
                        car_id=car.id,
                        slot_id=slot.id,
                        start_time=start_time,
                        end_time=None,
                        duration=None,
                        fee=None,
                        status=SessionStatus.ACTIVE.value,
                    )
                    db.add(session)
                    slot.status = SlotStatus.OCCUPIED.value
                    db.flush()

            print(f"  [+] Created {len(finished_session_configs)} finished sessions with matched completed transactions")
            print(f"  [+] Created {len(active_slot_indices)} active parking sessions")
        else:
            print(f"  [=] Parking sessions exist ({existing_sessions_count})")

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
        print("  CITIES (Strictly 6 Cities):")
        for c in CITIES_DATA:
            print(f"    - {c['name']} ({c['name_mm']})")
        print()
        print("  PARKING LOTS:")
        for i, lot in enumerate(PARKING_LOTS, 1):
            print(f"    {i:02d}. [{lot['city']:<15}] {lot['name']}")
        print("=" * 70 + "\n")

    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed()
