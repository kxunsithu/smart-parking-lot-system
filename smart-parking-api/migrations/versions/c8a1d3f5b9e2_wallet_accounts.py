"""wallet accounts + external payment payment columns

Revision ID: c8a1d3f5b9e2
Revises: b52fe6a6f933
Create Date: 2026-08-02 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8a1d3f5b9e2'
down_revision: Union[str, None] = 'b52fe6a6f933'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('wallet_accounts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('wallet_phone', sa.String(length=20), nullable=True),
    sa.Column('api_key', sa.String(length=255), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['parking_owners.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('wallet_accounts', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_wallet_accounts_id'), ['id'], unique=False)
        batch_op.create_index('ix_wallet_accounts_owner_id', ['owner_id'], unique=True)

    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('wallet_account_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('wallet_payment_reference', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('wallet_transaction_number', sa.String(length=64), nullable=True))
        batch_op.drop_column('wallet_payment_id')
        batch_op.drop_column('wallet_transaction_id')
        batch_op.create_foreign_key('fk_payments_wallet_account_id', 'wallet_accounts', ['wallet_account_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_payments_wallet_account_id', ['wallet_account_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index('ix_payments_wallet_account_id')
        batch_op.drop_constraint('fk_payments_wallet_account_id', type_='foreignkey')
        batch_op.add_column(sa.Column('wallet_transaction_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('wallet_payment_id', sa.Integer(), nullable=True))
        batch_op.drop_column('wallet_transaction_number')
        batch_op.drop_column('wallet_payment_reference')
        batch_op.drop_column('wallet_account_id')

    with op.batch_alter_table('wallet_accounts', schema=None) as batch_op:
        batch_op.drop_index('ix_wallet_accounts_owner_id')
        batch_op.drop_index(batch_op.f('ix_wallet_accounts_id'))

    op.drop_table('wallet_accounts')
