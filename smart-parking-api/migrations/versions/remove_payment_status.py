"""remove payment status from subscription

Revision ID: remove_pay_status
Revises: sub_payment_conn
Create Date: 2026-07-28 04:12:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_pay_status'
down_revision = 'sub_payment_conn'
branch_labels = None
depends_on = None


def upgrade():
    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_column('payment_status')


def downgrade():
    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_status', sa.String(20), nullable=False, server_default='pending'))
