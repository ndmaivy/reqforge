"""Add append-only human review decision history."""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20261017_0009"
down_revision: str | None = "20261007_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "review_decision_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column(
            "subject_type",
            sa.Enum("USER_NEED", "REQUIREMENT", name="review_subject_type"),
            nullable=False,
        ),
        sa.Column("subject_id", sa.Uuid(), nullable=False),
        sa.Column(
            "decision",
            sa.Enum("CONFIRMED", "REJECTED", "APPROVED", "REOPENED", name="review_decision"),
            nullable=False,
        ),
        sa.Column("previous_status", sa.String(length=50), nullable=False),
        sa.Column("new_status", sa.String(length=50), nullable=False),
        sa.Column("reviewer_id", sa.Uuid(), nullable=True),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("source_analysis_run_id", sa.Uuid(), nullable=True),
        sa.Column("ai_confidence_snapshot", sa.Numeric(5, 4), nullable=True),
        sa.Column(
            "proposal_snapshot",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=False,
        ),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["source_analysis_run_id"], ["analysis_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "ai_confidence_snapshot IS NULL OR "
            "(ai_confidence_snapshot >= 0 AND ai_confidence_snapshot <= 1)",
            name="ck_review_decision_confidence_range",
        ),
    )
    op.create_index(
        "ix_review_decision_events_subject",
        "review_decision_events",
        ["project_id", "subject_type", "subject_id", "decided_at"],
    )
    op.create_index(
        "ix_review_decision_events_project_id", "review_decision_events", ["project_id"]
    )
    op.create_index(
        "ix_review_decision_events_reviewer_id", "review_decision_events", ["reviewer_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_review_decision_events_reviewer_id", table_name="review_decision_events")
    op.drop_index("ix_review_decision_events_project_id", table_name="review_decision_events")
    op.drop_index("ix_review_decision_events_subject", table_name="review_decision_events")
    op.drop_table("review_decision_events")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS review_decision")
        op.execute("DROP TYPE IF EXISTS review_subject_type")
