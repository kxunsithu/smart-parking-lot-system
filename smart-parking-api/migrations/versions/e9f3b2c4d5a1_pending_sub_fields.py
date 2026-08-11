"""Add pending_package_id, pending_owner_id, is_renewal to pending_wallet_payments

These fields allow the system to create a subscription record only after
the wallet payment is confirmed, eliminating the PENDING subscription status.

Revision ID: e9f3b2c4d5a1
Revises: 5c1e7a3b9d2f
Create Date: 2026-08-11 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9f3b2c4d5a1'
down_revision: Union[str, None] = '5c1e7a3b9d2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('pending_package_id', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('pending_owner_id', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('is_renewal', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.create_foreign_key(
            'fk_pending_payments_package',
            'packages',
            ['pending_package_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_foreign_key(
            'fk_pending_payments_owner',
            'parking_owners',
            ['pending_owner_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_pending_payments_owner', type_='foreignkey')
        batch_op.drop_constraint('fk_pending_payments_package', type_='foreignkey')
        batch_op.drop_column('is_renewal')
        batch_op.drop_column('pending_owner_id')
        batch_op.drop_column('pending_package_id')
