"""add transaction_ref to payments table

Revision ID: add_transaction_ref_to_payments
Revises: add_packages_subscriptions
Create Date: 2026-07-29 07:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_transaction_ref_to_payments'
down_revision: Union[str, None] = 'add_packages_subscriptions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payments', sa.Column('transaction_ref', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('payments', 'transaction_ref')
