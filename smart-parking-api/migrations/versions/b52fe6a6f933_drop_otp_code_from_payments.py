"""drop otp_code from payments

Revision ID: b52fe6a6f933
Revises: b7c2a91f4e12
Create Date: 2026-08-01 14:03:04.923455

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b52fe6a6f933'
down_revision: Union[str, None] = 'b7c2a91f4e12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_column('otp_code')


def downgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('otp_code', sa.String(length=6), nullable=True))
