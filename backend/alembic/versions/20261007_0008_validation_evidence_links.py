"""Persist independent requirement validation evidence snapshots."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261007_0008"
down_revision: str | None = "20260910_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "validation_evidence_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("analysis_run_id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column("user_need_id", sa.Uuid(), nullable=True),
        sa.Column("feedback_id", sa.Uuid(), nullable=False),
        sa.Column(
            "evidence_origin",
            sa.Enum(
                "GROUPING_EVIDENCE",
                "VALIDATION_EVIDENCE",
                name="validation_evidence_origin",
            ),
            nullable=False,
        ),
        sa.Column("retrieval_method", sa.Text(), nullable=True),
        sa.Column("retrieval_rank", sa.Integer(), nullable=True),
        sa.Column("retrieval_score", sa.Numeric(8, 7), nullable=True),
        sa.Column("character_similarity_score", sa.Numeric(8, 7), nullable=True),
        sa.Column(
            "validation_relation",
            sa.Enum(
                "SUPPORTS",
                "CONTRADICTS",
                "IRRELEVANT",
                name="validation_evidence_relation",
            ),
            nullable=True,
        ),
        sa.Column("validation_rationale", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["feedback_id"], ["feedback.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_need_id"], ["user_needs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "retrieval_score IS NULL OR (retrieval_score >= 0 AND retrieval_score <= 1)",
            name="ck_validation_evidence_retrieval_score_range",
        ),
        sa.CheckConstraint(
            "character_similarity_score IS NULL OR "
            "(character_similarity_score >= 0 AND character_similarity_score <= 1)",
            name="ck_validation_evidence_character_score_range",
        ),
    )
    op.create_index(
        "ix_validation_evidence_links_run_id",
        "validation_evidence_links",
        ["analysis_run_id"],
    )
    op.create_index(
        "ix_validation_evidence_links_requirement_id",
        "validation_evidence_links",
        ["requirement_id"],
    )
    op.create_index(
        "ix_validation_evidence_links_feedback_id",
        "validation_evidence_links",
        ["feedback_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_validation_evidence_links_feedback_id", table_name="validation_evidence_links"
    )
    op.drop_index(
        "ix_validation_evidence_links_requirement_id", table_name="validation_evidence_links"
    )
    op.drop_index("ix_validation_evidence_links_run_id", table_name="validation_evidence_links")
    op.drop_table("validation_evidence_links")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS validation_evidence_relation")
        op.execute("DROP TYPE IF EXISTS validation_evidence_origin")
