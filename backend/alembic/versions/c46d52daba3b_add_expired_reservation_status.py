"""add expired reservation status

Revision ID: c46d52daba3b
Revises: c24b44bf5ac4
Create Date: 2026-08-13 17:06:41.255853

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c46d52daba3b'
down_revision: Union[str, None] = 'c24b44bf5ac4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Same reasoning as c24b44bf5ac4 (add admin user role): SQLite never
    # created a real "reservationstatus" enum type to begin with, so only
    # Postgres needs the type extended.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE reservationstatus ADD VALUE IF NOT EXISTS 'expired'")


def downgrade() -> None:
    # Same as c24b44bf5ac4: Postgres has no direct "remove a value from an
    # enum type" operation. Downgrading past this migration is not
    # supported.
    pass
