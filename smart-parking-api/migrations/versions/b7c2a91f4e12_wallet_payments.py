"""wallet payments + subscription status PENDING

Revision ID: b7c2a91f4e12
Revises: 83055a782cfd
Create Date: 2026-08-01 13:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c2a91f4e12'
down_revision: Union[str, None] = '83055a782cfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the legacy, unused payments table (old cash/KBZPay schema) so the new
    # wallet-payment table can take over the same name.
    if op.get_bind().dialect.name == 'sqlite':
        op.execute('DROP TABLE IF EXISTS payments')

    op.create_table('payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('session_id', sa.Integer(), nullable=True),
    sa.Column('subscription_id', sa.Integer(), nullable=True),
    sa.Column('wallet_payment_id', sa.Integer(), nullable=True),
    sa.Column('wallet_transaction_id', sa.Integer(), nullable=True),
    sa.Column('otp_code', sa.String(length=6), nullable=True),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('fee', sa.Float(), nullable=False),
    sa.Column('total', sa.Float(), nullable=False),
    sa.Column('reference', sa.String(length=100), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('paid_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['parking_sessions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['subscription_id'], ['owner_subscriptions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payments_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_payments_reference'), ['reference'], unique=True)
        batch_op.create_index(batch_op.f('ix_payments_status'), ['status'], unique=False)
        batch_op.create_index('ix_payments_session_id', ['session_id'], unique=False)
        batch_op.create_index('ix_payments_subscription_id', ['subscription_id'], unique=False)

    with op.batch_alter_table('owner_subscriptions', schema=None) as batch_op:
        batch_op.alter_column('started_at', existing_type=sa.DateTime(), nullable=True)
        batch_op.alter_column('expires_at', existing_type=sa.DateTime(), nullable=True)
        batch_op.drop_column('payment_method')
        batch_op.drop_column('transaction_ref')
        batch_op.drop_constraint('ck_owner_subscriptions_status', type_='check')
        batch_op.create_check_constraint(
            'ck_owner_subscriptions_status',
            "status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED')",
        )


def downgrade() -> None:
    with op.batch_alter_table('owner_subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('transaction_ref', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='CASH'))
        batch_op.alter_column('expires_at', existing_type=sa.DateTime(), nullable=False)
        batch_op.alter_column('started_at', existing_type=sa.DateTime(), nullable=False)

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index('ix_payments_subscription_id')
        batch_op.drop_index('ix_payments_session_id')
        batch_op.drop_index(batch_op.f('ix_payments_status'))
        batch_op.drop_index(batch_op.f('ix_payments_reference'))
        batch_op.drop_index(batch_op.f('ix_payments_id'))

    op.drop_table('payments')
