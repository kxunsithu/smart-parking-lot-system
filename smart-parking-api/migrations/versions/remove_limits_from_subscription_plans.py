"""remove limits from subscription plans

Revision ID: remove_limits
Revises: add_max_slot
Create Date: 2026-07-28 03:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_limits'
down_revision = 'add_max_slot'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.drop_column('max_parking_lots')
        batch_op.drop_column('max_staff')
        batch_op.drop_column('max_slot')


def downgrade():
    with op.batch_alter_table('subscription_plans', schema=None) as batch_op:
        batch_op.add_column(sa.Column('max_parking_lots', sa.Integer(), nullable=False, server_default='5'))
        batch_op.add_column(sa.Column('max_staff', sa.Integer(), nullable=False, server_default='10'))
        batch_op.add_column(sa.Column('max_slot', sa.Integer(), nullable=False, server_default='50'))
