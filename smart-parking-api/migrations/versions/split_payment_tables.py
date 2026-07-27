"""split payment tables by type

Revision ID: split_payments
Revises: remove_pay_status
Create Date: 2026-07-28 04:17:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'split_payments'
down_revision = 'remove_pay_status'
branch_labels = None
depends_on = None


def upgrade():
    # Create subscription_payments table
    op.create_table(
        'subscription_payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False, server_default='cash'),
        sa.Column('status', sa.String(20), nullable=False, server_default='paid', index=True),
        sa.Column('paid_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create parking_session_payments table
    op.create_table(
        'parking_session_payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('parking_session_id', sa.Integer(), sa.ForeignKey('parking_sessions.id'), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False, server_default='cash'),
        sa.Column('status', sa.String(20), nullable=False, server_default='paid', index=True),
        sa.Column('paid_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create reservation_payments table
    op.create_table(
        'reservation_payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id'), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False, server_default='cash'),
        sa.Column('status', sa.String(20), nullable=False, server_default='paid', index=True),
        sa.Column('paid_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Migrate existing data from payments table
    # Note: This is a simple migration - in production you might want more sophisticated data migration logic
    op.execute("""
        INSERT INTO parking_session_payments (parking_session_id, customer_id, amount, payment_method, status, paid_at)
        SELECT parking_session_id, customer_id, amount, payment_method, status, paid_at
        FROM payments
        WHERE parking_session_id IS NOT NULL
    """)

    op.execute("""
        INSERT INTO reservation_payments (reservation_id, customer_id, amount, payment_method, status, paid_at)
        SELECT reservation_id, customer_id, amount, payment_method, status, paid_at
        FROM payments
        WHERE reservation_id IS NOT NULL
    """)

    op.execute("""
        INSERT INTO subscription_payments (subscription_id, amount, payment_method, status, paid_at)
        SELECT subscription_id, amount, payment_method, status, paid_at
        FROM payments
        WHERE subscription_id IS NOT NULL
    """)

    # Drop old payments table
    op.drop_table('payments')


def downgrade():
    # Recreate old payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('parking_session_id', sa.Integer(), sa.ForeignKey('parking_sessions.id'), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id'), nullable=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id'), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False, server_default='cash'),
        sa.Column('status', sa.String(20), nullable=False, server_default='paid', index=True),
        sa.Column('paid_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Migrate data back
    op.execute("""
        INSERT INTO payments (parking_session_id, customer_id, amount, payment_method, status, paid_at)
        SELECT parking_session_id, customer_id, amount, payment_method, status, paid_at
        FROM parking_session_payments
    """)

    op.execute("""
        INSERT INTO payments (reservation_id, customer_id, amount, payment_method, status, paid_at)
        SELECT reservation_id, customer_id, amount, payment_method, status, paid_at
        FROM reservation_payments
    """)

    op.execute("""
        INSERT INTO payments (subscription_id, amount, payment_method, status, paid_at)
        SELECT subscription_id, amount, payment_method, status, paid_at
        FROM subscription_payments
    """)

    # Drop new tables
    op.drop_table('subscription_payments')
    op.drop_table('parking_session_payments')
    op.drop_table('reservation_payments')
