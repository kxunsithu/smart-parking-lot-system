"""Add profile_image to users table

Revision ID: f8b9c0d1e2f3
Revises: e9f3b2c4d5a1
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8b9c0d1e2f3'
down_revision: Union[str, None] = 'e9f3b2c4d5a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('profile_image', sa.String(length=255), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('profile_image')
