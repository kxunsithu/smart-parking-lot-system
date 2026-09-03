"""Seed script: creates default roles, packages, users (admin / 3 owners / 5 staff / 2 customers),
5 real Yangon parking lots with GPS coordinates, floors, slots, subscriptions, and customer cars.

Usage (from the smart-parking-api directory):
    python -m scripts.seed
"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

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
    # ── Owners (20) ── emails follow company-name format ─────────────────────
    {
        "name": "Khun Si Thu",
        "email": "kst.parking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000001",
        "is_verified": True,
    },
    {
        "name": "Myo Aung",
        "email": "ma.parkingsolutions@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000002",
        "is_verified": True,
    },
    {
        "name": "Thida Win",
        "email": "tw.premiumparking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000003",
        "is_verified": True,
    },
    {
        "name": "Aung Ko Ko",
        "email": "akk.smartparking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000004",
        "is_verified": True,
    },
    {
        "name": "Htet Htet Swe",
        "email": "hhs.parkingmgmt@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000005",
        "is_verified": True,
    },
    {
        "name": "Zaw Min",
        "email": "zm.cityparking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000006",
        "is_verified": True,
    },
    {
        "name": "Nilar Kyaw",
        "email": "nk.parkinggroup@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000007",
        "is_verified": True,
    },
    {
        "name": "Kyaw Zin Thant",
        "email": "kzt.autopark@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000008",
        "is_verified": True,
    },
    {
        "name": "Su Myat Noe",
        "email": "smn.parkinghub@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000009",
        "is_verified": True,
    },
    {
        "name": "Wai Yan Oo",
        "email": "wyo.parkgo@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000010",
        "is_verified": True,
    },
    {
        "name": "Phyo Min Tun",
        "email": "pmt.parking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000011",
        "is_verified": True,
    },
    {
        "name": "Ei Ei Phyu",
        "email": "eep.lotmgmt@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000012",
        "is_verified": True,
    },
    {
        "name": "Htun Htun Oo",
        "email": "hho.parkingworld@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000013",
        "is_verified": True,
    },
    {
        "name": "Mie Mie Khin",
        "email": "mmk.urbanparking@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000014",
        "is_verified": True,
    },
    {
        "name": "Nay Oo",
        "email": "no.expresspark@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000015",
        "is_verified": True,
    },
    {
        "name": "Thin Thin Aye",
        "email": "tta.parkingplus@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000016",
        "is_verified": True,
    },
    {
        "name": "Kyaw Htet",
        "email": "kh.securelots@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000017",
        "is_verified": True,
    },
    {
        "name": "Aye Aye Win",
        "email": "aaw.parkingco@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000018",
        "is_verified": True,
    },
    {
        "name": "Mg Mg Lwin",
        "email": "mml.smartpark@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000019",
        "is_verified": True,
    },
    {
        "name": "Sandar Oo",
        "email": "so.premiumlots@gmail.com",
        "role": RoleName.OWNER.value,
        "phone": "+959600000020",
        "is_verified": True,
    },
    # ── Staff (20) ────────────────────────────────────────────────────────────
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
        "phone": "+959700000001",
        "is_verified": True,
    },
    {
        "name": "Su Su Htwe",
        "email": "susuhtwe.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000002",
        "is_verified": True,
    },
    {
        "name": "Kyaw Kyaw",
        "email": "kyawkyaw.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000003",
        "is_verified": True,
    },
    {
        "name": "Aye Myat Mon",
        "email": "ayemyatmon.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000004",
        "is_verified": True,
    },
    {
        "name": "Nay Lin Htun",
        "email": "naylinhtun.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000005",
        "is_verified": True,
    },
    {
        "name": "Moe Moe Khin",
        "email": "moemoe.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000006",
        "is_verified": True,
    },
    {
        "name": "Ye Naing",
        "email": "yenaing.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000007",
        "is_verified": True,
    },
    {
        "name": "Thin Zar Aung",
        "email": "thinzar.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000008",
        "is_verified": True,
    },
    {
        "name": "Kyaw Zin Oo",
        "email": "kyawzin.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000009",
        "is_verified": True,
    },
    {
        "name": "Min Thant",
        "email": "minthant.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000010",
        "is_verified": True,
    },
    {
        "name": "Ei Ei Thaw",
        "email": "eieithaw.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000011",
        "is_verified": True,
    },
    {
        "name": "Kaung Htet",
        "email": "kaunghtet.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000012",
        "is_verified": True,
    },
    {
        "name": "Nilar Aye",
        "email": "nilaraye.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000013",
        "is_verified": True,
    },
    {
        "name": "Win Ko",
        "email": "winko.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000014",
        "is_verified": True,
    },
    {
        "name": "Hlaing Min",
        "email": "hlaingmin.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000015",
        "is_verified": True,
    },
    {
        "name": "May Thet",
        "email": "maythet.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000016",
        "is_verified": True,
    },
    {
        "name": "Thant Zin",
        "email": "thantzin.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000017",
        "is_verified": True,
    },
    {
        "name": "May Wai",
        "email": "maywai.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000018",
        "is_verified": True,
    },
    {
        "name": "Zin Ko Ko",
        "email": "zinkoko.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000019",
        "is_verified": True,
    },
    {
        "name": "Pyae Sone",
        "email": "pyaesone.staff@gmail.com",
        "role": RoleName.STAFF.value,
        "phone": "+959700000020",
        "is_verified": True,
    },
    # ── Customers (20) ───────────────────────────────────────────────────────
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
        "phone": "+959800000001",
        "is_verified": True,
    },
    {
        "name": "Wai Phyo",
        "email": "waiphyo.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000002",
        "is_verified": True,
    },
    {
        "name": "Zin Mar Oo",
        "email": "zinmar.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000003",
        "is_verified": True,
    },
    {
        "name": "Phyo Wai Kyaw",
        "email": "phyowai.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000004",
        "is_verified": True,
    },
    {
        "name": "Chan Myae Aung",
        "email": "chanmyae.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000005",
        "is_verified": True,
    },
    {
        "name": "Ei Phyu Sin",
        "email": "eiphyu.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000006",
        "is_verified": True,
    },
    {
        "name": "Aye Aye Khin",
        "email": "ayeaye.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000007",
        "is_verified": True,
    },
    {
        "name": "Mg Htun",
        "email": "mghtun.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000008",
        "is_verified": True,
    },
    {
        "name": "Moe Pwint",
        "email": "moepwint.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000009",
        "is_verified": True,
    },
    {
        "name": "Ko Kyaw",
        "email": "kokyaw.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000010",
        "is_verified": True,
    },
    {
        "name": "Ma Thandar",
        "email": "mathandar.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000011",
        "is_verified": True,
    },
    {
        "name": "Win Myat",
        "email": "winmyat.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000012",
        "is_verified": True,
    },
    {
        "name": "Nanda Aung",
        "email": "nandaaung.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000013",
        "is_verified": True,
    },
    {
        "name": "Thet Mon",
        "email": "thetmon.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000014",
        "is_verified": True,
    },
    {
        "name": "Kyaw Thu",
        "email": "kyawthu.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000015",
        "is_verified": True,
    },
    {
        "name": "Su Yadanar",
        "email": "suyadanar.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000016",
        "is_verified": True,
    },
    {
        "name": "Aung Aung",
        "email": "aungaung.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000017",
        "is_verified": True,
    },
    {
        "name": "Khin Moe",
        "email": "khinmoe.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000018",
        "is_verified": True,
    },
    {
        "name": "Min Zaw",
        "email": "minzaw.customer@gmail.com",
        "role": RoleName.CUSTOMER.value,
        "phone": "+959800000019",
        "is_verified": True,
    },
]

# ---------------------------------------------------------------------------
# Owner profiles  →  company name & subscription package
# ---------------------------------------------------------------------------

OWNER_PROFILES = {
    "kst.parking@gmail.com": {
        "company_name": "KST Parking Co., Ltd.",
        "package": "Pro",
    },
    "ma.parkingsolutions@gmail.com": {
        "company_name": "MA Parking Solutions",
        "package": "Basic",
    },
    "tw.premiumparking@gmail.com": {
        "company_name": "TW Premium Parking",
        "package": "Enterprise",
    },
    "akk.smartparking@gmail.com": {
        "company_name": "AKK Smart Parking",
        "package": "Pro",
    },
    "hhs.parkingmgmt@gmail.com": {
        "company_name": "HHS Parking Management",
        "package": "Basic",
    },
    "zm.cityparking@gmail.com": {
        "company_name": "ZM City Parking",
        "package": "Basic",
    },
    "nk.parkinggroup@gmail.com": {
        "company_name": "NK Parking Group",
        "package": "Pro",
    },
    "kzt.autopark@gmail.com": {
        "company_name": "KZT Auto Park",
        "package": "Basic",
    },
    "smn.parkinghub@gmail.com": {
        "company_name": "SMN Parking Hub",
        "package": "Enterprise",
    },
    "wyo.parkgo@gmail.com": {
        "company_name": "WYO Park & Go",
        "package": "Pro",
    },
    "pmt.parking@gmail.com": {
        "company_name": "PMT Parking Services",
        "package": "Basic",
    },
    "eep.lotmgmt@gmail.com": {
        "company_name": "EEP Lot Management",
        "package": "Basic",
    },
    "hho.parkingworld@gmail.com": {
        "company_name": "HHO Parking World",
        "package": "Enterprise",
    },
    "mmk.urbanparking@gmail.com": {
        "company_name": "MMK Urban Parking",
        "package": "Pro",
    },
    "no.expresspark@gmail.com": {
        "company_name": "NO Express Parking",
        "package": "Basic",
    },
    "tta.parkingplus@gmail.com": {
        "company_name": "TTA Parking Plus",
        "package": "Pro",
    },
    "kh.securelots@gmail.com": {
        "company_name": "KH Secure Lots",
        "package": "Basic",
    },
    "aaw.parkingco@gmail.com": {
        "company_name": "AAW Parking Co.",
        "package": "Enterprise",
    },
    "mml.smartpark@gmail.com": {
        "company_name": "MML Smart Park",
        "package": "Pro",
    },
    "so.premiumlots@gmail.com": {
        "company_name": "SO Premium Lots",
        "package": "Basic",
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
        "owner_email": "kst.parking@gmail.com",
        "name": "Yangon Central Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.77410,96.15940&z=15&output=embed",
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
        "owner_email": "kst.parking@gmail.com",
        "name": "Bogyoke Market Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.78210,96.15430&z=15&output=embed",
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
        "owner_email": "ma.parkingsolutions@gmail.com",
        "name": "Sule Square Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.77690,96.15890&z=15&output=embed",
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
        "owner_email": "tw.premiumparking@gmail.com",
        "name": "Junction Square Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.83150,96.13450&z=15&output=embed",
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
        "owner_email": "tw.premiumparking@gmail.com",
        "name": "Junction City Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.79020,96.14520&z=15&output=embed",
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

    # ── 6. Thaketa Township Parking (Thaketa Tsp) ─────────────────────────
    {
        "owner_email": "akk.smartparking@gmail.com",
        "name": "Thaketa Township Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.80250,96.19380&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["naylinhtun.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.80251, "longitude": 96.19381},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.80252, "longitude": 96.19382},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.80253, "longitude": 96.19383},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.80254, "longitude": 96.19384},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.80255, "longitude": 96.19385},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.80256, "longitude": 96.19386},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.80257, "longitude": 96.19387},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.80258, "longitude": 96.19388},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.80259, "longitude": 96.19389},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.80260, "longitude": 96.19390},
                ],
            },
        ],
    },

    # ── 7. Insein Road Parking (Insein Tsp) ───────────────────────────────
    {
        "owner_email": "akk.smartparking@gmail.com",
        "name": "Insein Road Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.87450,96.09820&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["moemoe.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.87451, "longitude": 96.09821},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.87452, "longitude": 96.09822},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.87453, "longitude": 96.09823},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.87454, "longitude": 96.09824},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.87455, "longitude": 96.09825},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.87456, "longitude": 96.09826},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.87461, "longitude": 96.09821},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.87462, "longitude": 96.09822},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.87463, "longitude": 96.09823},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.87464, "longitude": 96.09824},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.87465, "longitude": 96.09825},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.87466, "longitude": 96.09826},
                ],
            },
        ],
    },

    # ── 8. Tamwe Market Parking (Tamwe Tsp) ───────────────────────────────
    {
        "owner_email": "hhs.parkingmgmt@gmail.com",
        "name": "Tamwe Market Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.82640,96.17120&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 450.0,
        "staff_emails": ["yenaing.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.82641, "longitude": 96.17121},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.82642, "longitude": 96.17122},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.82643, "longitude": 96.17123},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.82644, "longitude": 96.17124},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.82645, "longitude": 96.17125},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.82646, "longitude": 96.17126},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.82647, "longitude": 96.17127},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.82648, "longitude": 96.17128},
                ],
            },
        ],
    },

    # ── 9. Kamayut Depot Parking (Kamayut Tsp) ────────────────────────────
    {
        "owner_email": "hhs.parkingmgmt@gmail.com",
        "name": "Kamayut Depot Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.83710,96.13250&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 550.0,
        "staff_emails": ["thinzar.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.83711, "longitude": 96.13251},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.83712, "longitude": 96.13252},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.83713, "longitude": 96.13253},
                    {"slot_number": "B1-A04", "section": "A", "latitude": 16.83714, "longitude": 96.13254},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.83715, "longitude": 96.13255},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.83716, "longitude": 96.13256},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.83717, "longitude": 96.13257},
                    {"slot_number": "B1-B04", "section": "B", "latitude": 16.83718, "longitude": 96.13258},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.83721, "longitude": 96.13251},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.83722, "longitude": 96.13252},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.83723, "longitude": 96.13253},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.83724, "longitude": 96.13254},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.83725, "longitude": 96.13255},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.83726, "longitude": 96.13256},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.83727, "longitude": 96.13257},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.83728, "longitude": 96.13258},
                ],
            },
        ],
    },

    # ── 10. Dagon Centre Parking (Dagon Tsp) ──────────────────────────────
    {
        "owner_email": "ma.parkingsolutions@gmail.com",
        "name": "Dagon Centre Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.77040,96.17590&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 650.0,
        "staff_emails": ["kyawzin.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.77041, "longitude": 96.17591},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.77042, "longitude": 96.17592},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.77043, "longitude": 96.17593},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.77044, "longitude": 96.17594},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.77045, "longitude": 96.17595},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.77046, "longitude": 96.17596},
                    {"slot_number": "B1-C01", "section": "C", "latitude": 16.77047, "longitude": 96.17597},
                    {"slot_number": "B1-C02", "section": "C", "latitude": 16.77048, "longitude": 96.17598},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.77051, "longitude": 96.17591},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.77052, "longitude": 96.17592},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.77053, "longitude": 96.17593},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.77054, "longitude": 96.17594},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.77055, "longitude": 96.17595},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.77056, "longitude": 96.17596},
                    {"slot_number": "L1-C01", "section": "C", "latitude": 16.77057, "longitude": 96.17597},
                    {"slot_number": "L1-C02", "section": "C", "latitude": 16.77058, "longitude": 96.17598},
                ],
            },
        ],
    },

    # ── 11. Yankin Market Parking (Yankin Tsp) ────────────────────────────
    {
        "owner_email": "kst.parking@gmail.com",
        "name": "Yankin Market Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.82960,96.16340&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.82961, "longitude": 96.16341},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.82962, "longitude": 96.16342},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.82963, "longitude": 96.16343},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.82964, "longitude": 96.16344},
                    {"slot_number": "G-A05", "section": "A", "latitude": 16.82965, "longitude": 96.16345},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.82966, "longitude": 96.16346},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.82967, "longitude": 96.16347},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.82968, "longitude": 96.16348},
                    {"slot_number": "G-B04", "section": "B", "latitude": 16.82969, "longitude": 96.16349},
                    {"slot_number": "G-B05", "section": "B", "latitude": 16.82970, "longitude": 96.16350},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.82971, "longitude": 96.16351},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.82972, "longitude": 96.16352},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.82981, "longitude": 96.16341},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.82982, "longitude": 96.16342},
                    {"slot_number": "L1-A03", "section": "A", "latitude": 16.82983, "longitude": 96.16343},
                    {"slot_number": "L1-A04", "section": "A", "latitude": 16.82984, "longitude": 96.16344},
                    {"slot_number": "L1-A05", "section": "A", "latitude": 16.82985, "longitude": 96.16345},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.82986, "longitude": 96.16346},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.82987, "longitude": 96.16347},
                    {"slot_number": "L1-B03", "section": "B", "latitude": 16.82988, "longitude": 96.16348},
                    {"slot_number": "L1-B04", "section": "B", "latitude": 16.82989, "longitude": 96.16349},
                    {"slot_number": "L1-B05", "section": "B", "latitude": 16.82990, "longitude": 96.16350},
                ],
            },
        ],
    },

    # ── 12. Hledan Centre Parking (Kamayut Tsp) ───────────────────────────
    {
        "owner_email": "hhs.parkingmgmt@gmail.com",
        "name": "Hledan Centre Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.82080,96.13060&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["minthant.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement 1 (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.82081, "longitude": 96.13061},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.82082, "longitude": 96.13062},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.82083, "longitude": 96.13063},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.82084, "longitude": 96.13064},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.82085, "longitude": 96.13065},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.82086, "longitude": 96.13066},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.82091, "longitude": 96.13061},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.82092, "longitude": 96.13062},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.82093, "longitude": 96.13063},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.82094, "longitude": 96.13064},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.82095, "longitude": 96.13065},
                    {"slot_number": "G-EV01", "section": "EV", "latitude": 16.82096, "longitude": 96.13066},
                    {"slot_number": "G-EV02", "section": "EV", "latitude": 16.82097, "longitude": 96.13067},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.82101, "longitude": 96.13061},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.82102, "longitude": 96.13062},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.82103, "longitude": 96.13063},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.82104, "longitude": 96.13064},
                ],
            },
        ],
    },

    # ── 13. Myanmar Plaza Parking (Yankin Tsp) ───────────────────────────
    {
        "owner_email": "tw.premiumparking@gmail.com",
        "name": "Myanmar Plaza Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.82850,96.15570&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 1200.0,
        "staff_emails": ["eieithaw.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement 1 (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.82851, "longitude": 96.15571},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.82852, "longitude": 96.15572},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.82853, "longitude": 96.15573},
                    {"slot_number": "B1-A04", "section": "A", "latitude": 16.82854, "longitude": 96.15574},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.82855, "longitude": 96.15575},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.82856, "longitude": 96.15576},
                    {"slot_number": "B1-B03", "section": "B", "latitude": 16.82857, "longitude": 96.15577},
                ],
            },
            {
                "floor_name": "Basement 2 (B2)",
                "slots": [
                    {"slot_number": "B2-A01", "section": "A", "latitude": 16.82861, "longitude": 96.15571},
                    {"slot_number": "B2-A02", "section": "A", "latitude": 16.82862, "longitude": 96.15572},
                    {"slot_number": "B2-B01", "section": "B", "latitude": 16.82863, "longitude": 96.15573},
                    {"slot_number": "B2-B02", "section": "B", "latitude": 16.82864, "longitude": 96.15574},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.82871, "longitude": 96.15571},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.82872, "longitude": 96.15572},
                    {"slot_number": "G-VIP01", "section": "VIP", "latitude": 16.82873, "longitude": 96.15573},
                    {"slot_number": "G-VIP02", "section": "VIP", "latitude": 16.82874, "longitude": 96.15574},
                ],
            },
        ],
    },

    # ── 14. Times City Parking (Kamayut Tsp) ─────────────────────────────
    {
        "owner_email": "akk.smartparking@gmail.com",
        "name": "Times City Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.80950,96.13020&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 1000.0,
        "staff_emails": ["kaunghtet.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement 1 (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.80951, "longitude": 96.13021},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.80952, "longitude": 96.13022},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.80953, "longitude": 96.13023},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.80954, "longitude": 96.13024},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.80955, "longitude": 96.13025},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.80961, "longitude": 96.13021},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.80962, "longitude": 96.13022},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.80963, "longitude": 96.13023},
                    {"slot_number": "L1-B02", "section": "B", "latitude": 16.80964, "longitude": 96.13024},
                ],
            },
        ],
    },

    # ── 15. St. John City Mall Parking (Lanmadaw Tsp) ────────────────────
    {
        "owner_email": "kst.parking@gmail.com",
        "name": "St. John City Mall Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.78010,96.14150&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 750.0,
        "staff_emails": ["nilaraye.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.78011, "longitude": 96.14151},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.78012, "longitude": 96.14152},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.78013, "longitude": 96.14153},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.78014, "longitude": 96.14154},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.78015, "longitude": 96.14155},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.78021, "longitude": 96.14151},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.78022, "longitude": 96.14152},
                    {"slot_number": "L1-B01", "section": "B", "latitude": 16.78023, "longitude": 96.14153},
                ],
            },
        ],
    },

    # ── 16. Ocean Supercenter Parking (South Okkalapa Tsp) ────────────────
    {
        "owner_email": "ma.parkingsolutions@gmail.com",
        "name": "Ocean Supercenter Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.85300,96.18500&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": ["winko.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.85301, "longitude": 96.18501},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.85302, "longitude": 96.18502},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.85303, "longitude": 96.18503},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.85304, "longitude": 96.18504},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.85305, "longitude": 96.18505},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.85306, "longitude": 96.18506},
                ],
            },
        ],
    },

    # ── 17. Hlaing Riverfront Parking (Hlaing Tsp) ─────────────────────────
    {
        "owner_email": "akk.smartparking@gmail.com",
        "name": "Hlaing Riverfront Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.84500,96.11500&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 600.0,
        "staff_emails": ["hlaingmin.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.84501, "longitude": 96.11501},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.84502, "longitude": 96.11502},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.84503, "longitude": 96.11503},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.84504, "longitude": 96.11504},
                ],
            },
            {
                "floor_name": "Level 1 (L1)",
                "slots": [
                    {"slot_number": "L1-A01", "section": "A", "latitude": 16.84511, "longitude": 96.11501},
                    {"slot_number": "L1-A02", "section": "A", "latitude": 16.84512, "longitude": 96.11502},
                ],
            },
        ],
    },

    # ── 18. North Dagon Plaza Parking (North Dagon Tsp) ───────────────────
    {
        "owner_email": "hhs.parkingmgmt@gmail.com",
        "name": "North Dagon Plaza Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.87200,96.18500&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": ["maythet.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.87201, "longitude": 96.18501},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.87202, "longitude": 96.18502},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.87203, "longitude": 96.18503},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.87204, "longitude": 96.18504},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.87205, "longitude": 96.18505},
                ],
            },
        ],
    },

    # ── 19. Sanpya Market Parking (Botahtaung Tsp) ──────────────────────
    {
        "owner_email": "zm.cityparking@gmail.com",
        "name": "Sanpya Market Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.76800,96.17200&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 450.0,
        "staff_emails": ["thantzin.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.76801, "longitude": 96.17201},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.76802, "longitude": 96.17202},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.76803, "longitude": 96.17203},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.76804, "longitude": 96.17204},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.76805, "longitude": 96.17205},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.76806, "longitude": 96.17206},
                ],
            },
        ],
    },

    # ── 20. Nilar Junction Parking (Sanchaung Tsp) ─────────────────────
    {
        "owner_email": "nk.parkinggroup@gmail.com",
        "name": "Nilar Junction Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.82300,96.13900&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 700.0,
        "staff_emails": ["maywai.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.82301, "longitude": 96.13901},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.82302, "longitude": 96.13902},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.82303, "longitude": 96.13903},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.82304, "longitude": 96.13904},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.82305, "longitude": 96.13905},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.82311, "longitude": 96.13901},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.82312, "longitude": 96.13902},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.82313, "longitude": 96.13903},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.82314, "longitude": 96.13904},
                ],
            },
        ],
    },

    # ── 21. East Dagon Township Parking (East Dagon Tsp) ────────────────
    {
        "owner_email": "kzt.autopark@gmail.com",
        "name": "East Dagon Township Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.83600,96.21200&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 350.0,
        "staff_emails": ["zinkoko.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.83601, "longitude": 96.21201},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.83602, "longitude": 96.21202},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.83603, "longitude": 96.21203},
                    {"slot_number": "G-A04", "section": "A", "latitude": 16.83604, "longitude": 96.21204},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.83605, "longitude": 96.21205},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.83606, "longitude": 96.21206},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.83607, "longitude": 96.21207},
                ],
            },
        ],
    },

    # ── 22. Shwe Gone Daing Parking (Bahan Tsp) ────────────────────────
    {
        "owner_email": "smn.parkinghub@gmail.com",
        "name": "Shwe Gone Daing Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.79800,96.16400&z=15&output=embed",
        "type": LotType.PRIVATE.value,
        "is_active": True,
        "rate_per_hour": 900.0,
        "staff_emails": ["pyaesone.staff@gmail.com"],
        "floors": [
            {
                "floor_name": "Basement 1 (B1)",
                "slots": [
                    {"slot_number": "B1-A01", "section": "A", "latitude": 16.79801, "longitude": 96.16401},
                    {"slot_number": "B1-A02", "section": "A", "latitude": 16.79802, "longitude": 96.16402},
                    {"slot_number": "B1-A03", "section": "A", "latitude": 16.79803, "longitude": 96.16403},
                    {"slot_number": "B1-B01", "section": "B", "latitude": 16.79804, "longitude": 96.16404},
                    {"slot_number": "B1-B02", "section": "B", "latitude": 16.79805, "longitude": 96.16405},
                    {"slot_number": "B1-VIP01", "section": "VIP", "latitude": 16.79806, "longitude": 96.16406},
                ],
            },
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.79811, "longitude": 96.16401},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.79812, "longitude": 96.16402},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.79813, "longitude": 96.16403},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.79814, "longitude": 96.16404},
                ],
            },
        ],
    },

    # ── 23. Bago Road Express Parking (Mingalataungnyunt Tsp) ───────────
    {
        "owner_email": "wyo.parkgo@gmail.com",
        "name": "Bago Road Express Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.81500,96.18900&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 500.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.81501, "longitude": 96.18901},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.81502, "longitude": 96.18902},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.81503, "longitude": 96.18903},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.81504, "longitude": 96.18904},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.81505, "longitude": 96.18905},
                    {"slot_number": "G-B03", "section": "B", "latitude": 16.81506, "longitude": 96.18906},
                    {"slot_number": "G-C01", "section": "C", "latitude": 16.81507, "longitude": 96.18907},
                    {"slot_number": "G-C02", "section": "C", "latitude": 16.81508, "longitude": 96.18908},
                ],
            },
        ],
    },

    # ── 24. Kyimyindaing Ferry Parking (Kyimyindaing Tsp) ───────────────
    {
        "owner_email": "pmt.parking@gmail.com",
        "name": "Kyimyindaing Ferry Parking",
        "google_map_url": "https://maps.google.com/maps?q=16.77900,96.12400&z=15&output=embed",
        "type": LotType.PUBLIC.value,
        "is_active": True,
        "rate_per_hour": 400.0,
        "staff_emails": [],
        "floors": [
            {
                "floor_name": "Ground Floor (G)",
                "slots": [
                    {"slot_number": "G-A01", "section": "A", "latitude": 16.77901, "longitude": 96.12401},
                    {"slot_number": "G-A02", "section": "A", "latitude": 16.77902, "longitude": 96.12402},
                    {"slot_number": "G-A03", "section": "A", "latitude": 16.77903, "longitude": 96.12403},
                    {"slot_number": "G-B01", "section": "B", "latitude": 16.77904, "longitude": 96.12404},
                    {"slot_number": "G-B02", "section": "B", "latitude": 16.77905, "longitude": 96.12405},
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
        {"plate_number": "1A-5555", "brand": "Nissan", "color": "Black"},
    ],
    "nainglin.customer@gmail.com": [
        {"plate_number": "2B-5678", "brand": "Honda", "color": "White"},
        {"plate_number": "3C-9012", "brand": "Suzuki", "color": "Red"},
    ],
    "waiphyo.customer@gmail.com": [
        {"plate_number": "4D-1111", "brand": "Mazda", "color": "Blue"},
        {"plate_number": "4D-2222", "brand": "Toyota", "color": "White"},
    ],
    "zinmar.customer@gmail.com": [
        {"plate_number": "5E-3333", "brand": "Hyundai", "color": "Grey"},
    ],
    "phyowai.customer@gmail.com": [
        {"plate_number": "6F-4444", "brand": "Mitsubishi", "color": "Black"},
        {"plate_number": "6F-5555", "brand": "Toyota", "color": "Gold"},
        {"plate_number": "6F-6666", "brand": "Honda", "color": "Silver"},
    ],
    "chanmyae.customer@gmail.com": [
        {"plate_number": "7G-7777", "brand": "Suzuki", "color": "White"},
        {"plate_number": "7G-8888", "brand": "Kia", "color": "Red"},
    ],
    "eiphyu.customer@gmail.com": [
        {"plate_number": "8H-9999", "brand": "Toyota", "color": "Pearl White"},
    ],
    "ayeaye.customer@gmail.com": [
        {"plate_number": "9J-1010", "brand": "Honda", "color": "Blue"},
        {"plate_number": "9J-2020", "brand": "Yamaha", "color": "Red"},
    ],
    "mghtun.customer@gmail.com": [
        {"plate_number": "0K-3030", "brand": "Toyota", "color": "White"},
    ],
    "moepwint.customer@gmail.com": [
        {"plate_number": "1L-4040", "brand": "Suzuki", "color": "Silver"},
        {"plate_number": "1L-5050", "brand": "Mazda", "color": "Black"},
    ],
    "kokyaw.customer@gmail.com": [
        {"plate_number": "2M-6060", "brand": "Mitsubishi", "color": "Grey"},
        {"plate_number": "2M-7070", "brand": "Toyota", "color": "Blue"},
    ],
    "mathandar.customer@gmail.com": [
        {"plate_number": "3N-8080", "brand": "Hyundai", "color": "White"},
    ],
    "winmyat.customer@gmail.com": [
        {"plate_number": "4P-9090", "brand": "Kia", "color": "Silver"},
        {"plate_number": "4P-0101", "brand": "Honda", "color": "Black"},
    ],
    "nandaaung.customer@gmail.com": [
        {"plate_number": "5Q-1111", "brand": "Toyota", "color": "Gold"},
    ],
    "thetmon.customer@gmail.com": [
        {"plate_number": "6R-2222", "brand": "Suzuki", "color": "Red"},
        {"plate_number": "6R-3333", "brand": "Toyota", "color": "White"},
        {"plate_number": "6R-4444", "brand": "Mazda", "color": "Blue"},
    ],
    "kyawthu.customer@gmail.com": [
        {"plate_number": "7S-5555", "brand": "Nissan", "color": "Black"},
    ],
    "suyadanar.customer@gmail.com": [
        {"plate_number": "8T-6666", "brand": "Honda", "color": "Pearl White"},
        {"plate_number": "8T-7777", "brand": "Hyundai", "color": "Grey"},
    ],
    "aungaung.customer@gmail.com": [
        {"plate_number": "9U-8888", "brand": "Toyota", "color": "Silver"},
        {"plate_number": "9U-9999", "brand": "Mitsubishi", "color": "White"},
    ],
    "khinmoe.customer@gmail.com": [
        {"plate_number": "0V-1234", "brand": "Kia", "color": "Red"},
    ],
    "minzaw.customer@gmail.com": [
        {"plate_number": "1W-5678", "brand": "Toyota", "color": "Blue"},
        {"plate_number": "1W-9012", "brand": "Suzuki", "color": "Silver"},
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_role(db, name: str, description: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        try:
            role = Role(name=name, description=description)
            db.add(role)
            db.flush()
            print(f"  [+] Role created: {name}")
        except IntegrityError:
            db.rollback()
            role = db.query(Role).filter(Role.name == name).first()
            if role:
                print(f"  [=] Role exists:  {name}")
            else:
                raise
    else:
        print(f"  [=] Role exists:  {name}")
    return role


def _get_or_create_user(db, name: str, email: str, role_id: int, phone: str, is_verified: bool) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        try:
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
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"  [=] User exists:   {email}")
            else:
                raise
    else:
        print(f"  [=] User exists:   {email}")
    return user


def _get_or_create_package(db, pkg_data: dict) -> Package:
    pkg = db.query(Package).filter(Package.name == pkg_data["name"]).first()
    if not pkg:
        try:
            pkg = Package(**pkg_data)
            db.add(pkg)
            db.flush()
            print(f"  [+] Package created: {pkg_data['name']}")
        except IntegrityError:
            db.rollback()
            pkg = db.query(Package).filter(Package.name == pkg_data["name"]).first()
            if pkg:
                print(f"  [=] Package exists:  {pkg_data['name']}")
            else:
                raise
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

        print("\n" + "=" * 70)
        print("✅  Seeding complete!")
        print("=" * 70)
        print()
        print("  Accounts (password: asdffdsa)")
        print("  ──────────────────────────────────────────────────────────────────")
        print("  [ADMIN]")
        print("    khunsithu350@gmail.com")
        print()
        print("  [OWNERS]  (20 accounts — emails follow company-name format)")
        print("    kst.parking@gmail.com        →  KST Parking Co., Ltd.    (Pro)")
        print("    ma.parkingsolutions@gmail.com→  MA Parking Solutions     (Basic)")
        print("    tw.premiumparking@gmail.com  →  TW Premium Parking       (Enterprise)")
        print("    akk.smartparking@gmail.com   →  AKK Smart Parking        (Pro)")
        print("    hhs.parkingmgmt@gmail.com    →  HHS Parking Management   (Basic)")
        print("    zm.cityparking@gmail.com     →  ZM City Parking          (Basic)")
        print("    nk.parkinggroup@gmail.com    →  NK Parking Group         (Pro)")
        print("    kzt.autopark@gmail.com       →  KZT Auto Park            (Basic)")
        print("    smn.parkinghub@gmail.com     →  SMN Parking Hub          (Enterprise)")
        print("    wyo.parkgo@gmail.com         →  WYO Park & Go            (Pro)")
        print("    pmt.parking@gmail.com        →  PMT Parking Services     (Basic)")
        print("    eep.lotmgmt@gmail.com        →  EEP Lot Management       (Basic)")
        print("    hho.parkingworld@gmail.com   →  HHO Parking World        (Enterprise)")
        print("    mmk.urbanparking@gmail.com   →  MMK Urban Parking        (Pro)")
        print("    no.expresspark@gmail.com     →  NO Express Parking       (Basic)")
        print("    tta.parkingplus@gmail.com    →  TTA Parking Plus         (Pro)")
        print("    kh.securelots@gmail.com      →  KH Secure Lots           (Basic)")
        print("    aaw.parkingco@gmail.com      →  AAW Parking Co.          (Enterprise)")
        print("    mml.smartpark@gmail.com      →  MML Smart Park           (Pro)")
        print("    so.premiumlots@gmail.com     →  SO Premium Lots          (Basic)")
        print()
        print("  [STAFF]  (20 accounts)")
        print("    khunsithu2003@gmail.com      →  Yangon Central Parking")
        print("    zawlin.staff@gmail.com       →  Sule Square Parking")
        print("    susuhtwe.staff@gmail.com     →  Junction Square Parking")
        print("    kyawkyaw.staff@gmail.com     →  Junction City Parking")
        print("    ayemyatmon.staff@gmail.com   →  Bogyoke Market Parking")
        print("    naylinhtun.staff@gmail.com   →  Thaketa Township Parking")
        print("    moemoe.staff@gmail.com       →  Insein Road Parking")
        print("    yenaing.staff@gmail.com      →  Tamwe Market Parking")
        print("    thinzar.staff@gmail.com      →  Kamayut Depot Parking")
        print("    kyawzin.staff@gmail.com      →  Dagon Centre Parking")
        print("    minthant.staff@gmail.com     →  Hledan Centre Parking")
        print("    eieithaw.staff@gmail.com     →  Myanmar Plaza Parking")
        print("    kaunghtet.staff@gmail.com    →  Times City Parking")
        print("    nilaraye.staff@gmail.com     →  St. John City Mall Parking")
        print("    winko.staff@gmail.com        →  Ocean Supercenter Parking")
        print("    hlaingmin.staff@gmail.com    →  Hlaing Riverfront Parking")
        print("    maythet.staff@gmail.com      →  North Dagon Plaza Parking")
        print("    thantzin.staff@gmail.com     →  Sanpya Market Parking")
        print("    maywai.staff@gmail.com       →  Nilar Junction Parking")
        print("    zinkoko.staff@gmail.com      →  East Dagon Township Parking")
        print("    pyaesone.staff@gmail.com     →  Shwe Gone Daing Parking")
        print()
        print("  [CUSTOMERS]  (20 accounts)")
        print("    khunsithuaung35@gmail.com    →  2 cars (Toyota Silver, Nissan Black)")
        print("    nainglin.customer@gmail.com  →  2 cars (Honda White, Suzuki Red)")
        print("    waiphyo.customer@gmail.com   →  2 cars (Mazda Blue, Toyota White)")
        print("    zinmar.customer@gmail.com    →  1 car  (Hyundai Grey)")
        print("    phyowai.customer@gmail.com   →  3 cars (Mitsubishi, Toyota, Honda)")
        print("    chanmyae.customer@gmail.com  →  2 cars (Suzuki White, Kia Red)")
        print("    eiphyu.customer@gmail.com    →  1 car  (Toyota Pearl White)")
        print("    ayeaye.customer@gmail.com    →  2 cars (Honda Blue, Yamaha Red)")
        print("    mghtun.customer@gmail.com    →  1 car  (Toyota White)")
        print("    moepwint.customer@gmail.com  →  2 cars (Suzuki Silver, Mazda Black)")
        print("    kokyaw.customer@gmail.com    →  2 cars (Mitsubishi Grey, Toyota Blue)")
        print("    mathandar.customer@gmail.com →  1 car  (Hyundai White)")
        print("    winmyat.customer@gmail.com   →  2 cars (Kia Silver, Honda Black)")
        print("    nandaaung.customer@gmail.com →  1 car  (Toyota Gold)")
        print("    thetmon.customer@gmail.com   →  3 cars (Suzuki Red, Toyota White, Mazda Blue)")
        print("    kyawthu.customer@gmail.com   →  1 car  (Nissan Black)")
        print("    suyadanar.customer@gmail.com →  2 cars (Honda Pearl White, Hyundai Grey)")
        print("    aungaung.customer@gmail.com  →  2 cars (Toyota Silver, Mitsubishi White)")
        print("    khinmoe.customer@gmail.com   →  1 car  (Kia Red)")
        print("    minzaw.customer@gmail.com    →  2 cars (Toyota Blue, Suzuki Silver)")
        print()
        print("  Parking Lots (Yangon, Myanmar)  — 24 lots")
        print("  ──────────────────────────────────────────────────────────────────")
        print("   1. Yangon Central Parking          16.7741, 96.1594   500/hr  [KST]")
        print("   2. Bogyoke Market Parking          16.7821, 96.1543   600/hr  [KST]")
        print("   3. Sule Square Parking             16.7769, 96.1589   800/hr  [MA]")
        print("   4. Junction Square Parking         16.8315, 96.1345   700/hr  [TW]")
        print("   5. Junction City Parking           16.7902, 96.1452  1000/hr  [TW]")
        print("   6. Thaketa Township Parking        16.8025, 96.1938   400/hr  [AKK]")
        print("   7. Insein Road Parking             16.8745, 96.0982   350/hr  [AKK]")
        print("   8. Tamwe Market Parking            16.8264, 96.1712   450/hr  [HHS]")
        print("   9. Kamayut Depot Parking           16.8371, 96.1325   550/hr  [HHS]")
        print("  10. Dagon Centre Parking            16.7704, 96.1759   650/hr  [MA]")
        print("  11. Yankin Market Parking           16.8296, 96.1634   500/hr  [KST]")
        print("  12. Hledan Centre Parking           16.8208, 96.1306   600/hr  [HHS]")
        print("  13. Myanmar Plaza Parking           16.8285, 96.1557  1200/hr  [TW]")
        print("  14. Times City Parking              16.8095, 96.1302  1000/hr  [AKK]")
        print("  15. St. John City Mall Parking      16.7801, 96.1415   750/hr  [KST]")
        print("  16. Ocean Supercenter Parking       16.8530, 96.1850   500/hr  [MA]")
        print("  17. Hlaing Riverfront Parking       16.8450, 96.1150   600/hr  [AKK]")
        print("  18. North Dagon Plaza Parking       16.8720, 96.1850   400/hr  [HHS]")
        print("  19. Sanpya Market Parking           16.7680, 96.1720   450/hr  [ZM]")
        print("  20. Nilar Junction Parking          16.8230, 96.1390   700/hr  [NK]")
        print("  21. East Dagon Township Parking     16.8360, 96.2120   350/hr  [KZT]")
        print("  22. Shwe Gone Daing Parking         16.7980, 96.1640   900/hr  [SMN]")
        print("  23. Bago Road Express Parking       16.8150, 96.1890   500/hr  [WYO]")
        print("  24. Kyimyindaing Ferry Parking      16.7790, 96.1240   400/hr  [PMT]")
        print("=" * 70)
        print()

    except Exception as exc:
        db.rollback()
        print(f"\n❌  Seeding failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
