"""merge_heads

Revision ID: 02d08b938ea8
Revises: add_transaction_ref_to_payments, move_created_by
Create Date: 2026-07-29 19:45:44.963219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02d08b938ea8'
down_revision: Union[str, None] = ('add_transaction_ref_to_payments', 'move_created_by')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
