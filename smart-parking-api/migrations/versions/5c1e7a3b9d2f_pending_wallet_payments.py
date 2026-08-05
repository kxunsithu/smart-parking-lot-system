"""pending wallet payments tracking + payments.receiver_phone

Revision ID: 5c1e7a3b9d2f
Revises: d4e2f6a8c1b0
Create Date: 2026-08-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c1e7a3b9d2f'
down_revision: Union[str, None] = 'd4e2f6a8c1b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pending_wallet_payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('wallet_account_id', sa.Integer(), nullable=True),
    sa.Column('session_id', sa.Integer(), nullable=True),
    sa.Column('subscription_id', sa.Integer(), nullable=True),
    sa.Column('reference', sa.String(length=100), nullable=False),
    sa.Column('wallet_payment_reference', sa.String(length=64), nullable=True),
    sa.Column('wallet_payment_url', sa.String(length=512), nullable=True),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('fee', sa.Float(), nullable=False),
    sa.Column('total', sa.Float(), nullable=False),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['parking_sessions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['subscription_id'], ['owner_subscriptions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    sa.ForeignKeyConstraint(['wallet_account_id'], ['wallet_accounts.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_pending_wallet_payments_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_pending_wallet_payments_reference'), ['reference'], unique=True)
        batch_op.create_index('ix_pending_wallet_payments_session_id', ['session_id'], unique=False)
        batch_op.create_index('ix_pending_wallet_payments_subscription_id', ['subscription_id'], unique=False)
        batch_op.create_index('ix_pending_wallet_payments_wallet_account_id', ['wallet_account_id'], unique=False)

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('receiver_phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_column('receiver_phone')

    with op.batch_alter_table('pending_wallet_payments', schema=None) as batch_op:
        batch_op.drop_index('ix_pending_wallet_payments_wallet_account_id')
        batch_op.drop_index('ix_pending_wallet_payments_subscription_id')
        batch_op.drop_index('ix_pending_wallet_payments_session_id')
        batch_op.drop_index(batch_op.f('ix_pending_wallet_payments_reference'))
        batch_op.drop_index(batch_op.f('ix_pending_wallet_payments_id'))

    op.drop_table('pending_wallet_payments')
