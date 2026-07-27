"""add max_slot to subscription_plans

Revision ID: add_max_slot
Revises: remove_features_from_subscription_plans
Create Date: 2026-07-28 03:18:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_max_slot'
down_revision = 'remove_features_from_subscription_plans'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('subscription_plans', sa.Column('max_slot', sa.Integer(), nullable=False, server_default='50'))


def downgrade():
    op.drop_column('subscription_plans', 'max_slot')
