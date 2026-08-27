"""Drop profile_image from users table

Revision ID: a4f5g6h7i8j9
Revises: a1b2c3d4e5f6
Create Date: 2026-08-27 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4f5g6h7i8j9"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "profile_image")


def downgrade() -> None:
    op.add_column("users", sa.Column("profile_image", sa.String(length=255), nullable=True))
