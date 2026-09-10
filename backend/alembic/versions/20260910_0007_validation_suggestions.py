"""Store actionable requirement validation suggestions."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260910_0007"
down_revision: str | None = "20260910_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("requirement_issues", sa.Column("suggested_change", sa.Text(), nullable=True))
    op.add_column(
        "requirement_issues", sa.Column("suggested_requirement", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("requirement_issues", "suggested_requirement")
    op.drop_column("requirement_issues", "suggested_change")
