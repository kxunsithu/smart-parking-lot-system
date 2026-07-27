"""change lot pricing to slot pricing

Revision ID: lot_to_slot
Revises: update_pricing
Create Date: 2026-07-28 03:59:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'lot_to_slot'
down_revision = 'update_pricing'
branch_labels = None
depends_on = None


def upgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('per_slot_price', sa.Float(), nullable=False, server_default='500.0'))
        batch_op.drop_column('per_lot_price')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_slots', sa.Integer(), nullable=False, server_default='1'))
        batch_op.drop_column('total_lots')


def downgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('per_lot_price', sa.Float(), nullable=False, server_default='500.0'))
        batch_op.drop_column('per_slot_price')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_lots', sa.Integer(), nullable=False, server_default='1'))
        batch_op.drop_column('total_slots')
