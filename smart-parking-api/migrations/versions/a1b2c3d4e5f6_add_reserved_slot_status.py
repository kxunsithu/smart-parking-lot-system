"""Add RESERVED to parking_slots status CHECK constraint

Revision ID: a1b2c3d4e5f6
Revises: f9a2b3c4d5e6
Create Date: 2026-08-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f9a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_parking_slots_status", "parking_slots", type_="check")
    op.create_check_constraint(
        "ck_parking_slots_status",
        "parking_slots",
        "status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_parking_slots_status", "parking_slots", type_="check")
    op.execute("UPDATE parking_slots SET status = 'AVAILABLE' WHERE status = 'RESERVED'")
    op.create_check_constraint(
        "ck_parking_slots_status",
        "parking_slots",
        "status IN ('AVAILABLE', 'OCCUPIED')",
    )
