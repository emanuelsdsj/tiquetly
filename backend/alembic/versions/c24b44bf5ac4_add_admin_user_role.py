"""add admin user role

Revision ID: c24b44bf5ac4
Revises: c7444f186d6f
Create Date: 2026-08-13 15:27:52.581540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c24b44bf5ac4'
down_revision: Union[str, None] = 'c7444f186d6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite (dev, e2e fixtures) never created a real "userrole" enum type
    # in the first place: SQLAlchemy's generic Enum emulates it as a plain
    # VARCHAR there with no CHECK constraint, so an "admin" row just works
    # once inserted, no schema change needed. Postgres (docker-compose,
    # production) does have a real enum type and needs it extended.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")


def downgrade() -> None:
    # Postgres has no direct "remove a value from an enum type" operation;
    # doing it safely means recreating the type and every column using it.
    # Out of scope for this project's dev/demo database, so downgrading
    # past this migration is not supported.
    pass
