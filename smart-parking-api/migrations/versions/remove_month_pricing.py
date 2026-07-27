"""remove month pricing columns

Revision ID: remove_month
Revises: lot_to_slot
Create Date: 2026-07-28 04:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_month'
down_revision = 'lot_to_slot'
branch_labels = None
depends_on = None


def upgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.drop_column('per_month_price')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_column('total_months')


def downgrade():
    # Update subscription_plans table
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('per_month_price', sa.Float(), nullable=False, server_default='1000.0'))

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_months', sa.Integer(), nullable=False, server_default='12'))
