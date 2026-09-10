"""Track evidence review state per project member.

Revision ID: 20260910_0005
Revises: 20260825_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260910_0005"
down_revision: str | None = "20260825_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_need_evidence_reviews",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("need_id", sa.Uuid(), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["need_id"], ["user_needs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "need_id"),
        sa.UniqueConstraint("user_id", "need_id", name="uq_user_need_evidence_review"),
    )
    op.create_index(
        "ix_user_need_evidence_reviews_need_id",
        "user_need_evidence_reviews",
        ["need_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_need_evidence_reviews_need_id", table_name="user_need_evidence_reviews")
    op.drop_table("user_need_evidence_reviews")
