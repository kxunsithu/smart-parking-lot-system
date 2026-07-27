"""update subscription payment connection

Revision ID: sub_payment_conn
Revises: remove_month
Create Date: 2026-07-28 04:09:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'sub_payment_conn'
down_revision = 'remove_month'
branch_labels = None
depends_on = None


def upgrade():
    # Update payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.alter_column('parking_session_id', nullable=True)
        batch_op.alter_column('customer_id', nullable=True)
        batch_op.add_column(sa.Column('subscription_id', sa.Integer(), nullable=True))

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.drop_column('start_date')
        batch_op.drop_column('end_date')
        batch_op.drop_column('amount_paid')
        batch_op.drop_column('payment_date')


def downgrade():
    # Update payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.alter_column('parking_session_id', nullable=False)
        batch_op.alter_column('customer_id', nullable=False)
        batch_op.drop_column('subscription_id')

    # Update subscriptions table
    with op.batch_alter_table('subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('start_date', sa.DateTime(timezone=True), nullable=False))
        batch_op.add_column(sa.Column('end_date', sa.DateTime(timezone=True), nullable=False))
        batch_op.add_column(sa.Column('amount_paid', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('payment_date', sa.DateTime(timezone=True), nullable=True))
