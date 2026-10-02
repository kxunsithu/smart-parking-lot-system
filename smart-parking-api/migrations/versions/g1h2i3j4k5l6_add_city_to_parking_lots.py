"""add city to parking lots

Revision ID: g1h2i3j4k5l6
Revises: f9a2b3c4d5e6
Create Date: 2026-10-02 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "parking_lots",
        sa.Column("city", sa.String(length=100), nullable=True),
    )
    op.create_index(
        op.f("ix_parking_lots_city"),
        "parking_lots",
        ["city"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_parking_lots_city"), table_name="parking_lots")
    op.drop_column("parking_lots", "city")
