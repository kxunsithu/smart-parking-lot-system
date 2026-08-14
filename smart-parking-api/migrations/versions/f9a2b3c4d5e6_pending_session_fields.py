"""Add pending_car_id, pending_slot_id, pending_start_time, pending_end_time to pending_wallet_payments

These fields allow the system to create a parking session record only after
the wallet payment is confirmed, eliminating the PENDING session status.

Revision ID: f9a2b3c4d5e6
Revises: f8b9c0d1e2f3
Create Date: 2026-08-13 01:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9a2b3c4d5e6'
down_revision: Union[str, None] = 'f8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('pending_car_id', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('pending_slot_id', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('pending_start_time', sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column('pending_end_time', sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_foreign_key(
            'fk_pending_payments_car',
            'cars',
            ['pending_car_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_foreign_key(
            'fk_pending_payments_slot',
            'parking_slots',
            ['pending_slot_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_pending_payments_slot', type_='foreignkey')
        batch_op.drop_constraint('fk_pending_payments_car', type_='foreignkey')
        batch_op.drop_column('pending_end_time')
        batch_op.drop_column('pending_start_time')
        batch_op.drop_column('pending_slot_id')
        batch_op.drop_column('pending_car_id')
