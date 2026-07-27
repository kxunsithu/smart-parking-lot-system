"""update subscription pricing model

Revision ID: update_pricing
Revises: remove_limits
Create Date: 2026-07-28 03:42:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_pricing'
down_revision = 'remove_limits'
branch_labels = None
depends_on = None


def upgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('per_month_price', sa.Float(), nullable=False, server_default='1000.0'))
        batch_op.add_column(sa.Column('per_lot_price', sa.Float(), nullable=False, server_default='500.0'))
        batch_op.drop_column('duration_months')
        batch_op.drop_column('price')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_months', sa.Integer(), nullable=False, server_default='12'))
        batch_op.add_column(sa.Column('total_lots', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('total_price', sa.Float(), nullable=False, server_default='0.0'))


def downgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('duration_months', sa.Integer(), nullable=False, server_default='12'))
        batch_op.add_column(sa.Column('price', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.drop_column('per_month_price')
        batch_op.drop_column('per_lot_price')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_column('total_months')
        batch_op.drop_column('total_lots')
        batch_op.drop_column('total_price')
