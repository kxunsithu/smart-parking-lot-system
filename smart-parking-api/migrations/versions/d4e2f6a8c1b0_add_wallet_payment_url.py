"""add wallet_payment_url to payments

Revision ID: d4e2f6a8c1b0
Revises: c8a1d3f5b9e2
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e2f6a8c1b0'
down_revision: Union[str, None] = 'c8a1d3f5b9e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('wallet_payment_url', sa.String(length=512), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_column('wallet_payment_url')
