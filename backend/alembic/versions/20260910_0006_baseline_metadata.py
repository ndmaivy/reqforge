"""Add display metadata to requirement baselines."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260910_0006"
down_revision: str | None = "20260910_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("requirement_baselines", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("requirement_baselines", sa.Column("notes", sa.Text(), nullable=True))
    op.execute(
        "UPDATE requirement_baselines SET name = 'Requirement Baseline ' || version "
        "WHERE name IS NULL"
    )
    op.alter_column("requirement_baselines", "name", nullable=False)


def downgrade() -> None:
    op.drop_column("requirement_baselines", "notes")
    op.drop_column("requirement_baselines", "name")
