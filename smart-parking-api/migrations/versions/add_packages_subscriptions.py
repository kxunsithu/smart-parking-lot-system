"""add packages and owner_subscriptions tables

Revision ID: add_packages_subscriptions
Revises: remove_position
Create Date: 2026-07-29 00:25:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_packages_subscriptions'
down_revision: Union[str, None] = 'remove_position'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('max_lots', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_staff', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_packages_id'), 'packages', ['id'], unique=False)

    op.create_table(
        'owner_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='CASH'),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('transaction_ref', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['parking_owners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_owner_subscriptions_id'), 'owner_subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_owner_subscriptions_owner_id'), 'owner_subscriptions', ['owner_id'], unique=False)
    op.create_index(op.f('ix_owner_subscriptions_package_id'), 'owner_subscriptions', ['package_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_owner_subscriptions_package_id'), table_name='owner_subscriptions')
    op.drop_index(op.f('ix_owner_subscriptions_owner_id'), table_name='owner_subscriptions')
    op.drop_index(op.f('ix_owner_subscriptions_id'), table_name='owner_subscriptions')
    op.drop_table('owner_subscriptions')

    op.drop_index(op.f('ix_packages_id'), table_name='packages')
    op.drop_table('packages')
