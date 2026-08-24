"""Create the ReqForge MVP schema.

Revision ID: 20260823_0001
Revises:
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260823_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

feedback_status = postgresql.ENUM(
    "NEW", "ANALYZED", "ARCHIVED", name="feedback_status", create_type=False
)
user_need_status = postgresql.ENUM(
    "CANDIDATE", "CONFIRMED", "REJECTED", name="user_need_status", create_type=False
)
requirement_status = postgresql.ENUM(
    "DRAFT",
    "NEEDS_REVIEW",
    "APPROVED",
    "REJECTED",
    "ARCHIVED",
    name="requirement_status",
    create_type=False,
)
generated_by_type = postgresql.ENUM("AI", "HUMAN", name="generated_by_type", create_type=False)
requirement_type = postgresql.ENUM(
    "FUNCTIONAL",
    "USABILITY",
    "INTERACTION",
    "ACCESSIBILITY",
    "NON_FUNCTIONAL",
    name="requirement_type",
    create_type=False,
)
requirement_issue_type = postgresql.ENUM(
    "MISSING_INFORMATION",
    "AMBIGUITY",
    "CONFLICT",
    "DUPLICATE",
    "UNSUPPORTED_ASSUMPTION",
    "INTENT_DRIFT",
    "FEEDBACK_INCONSISTENCY",
    name="requirement_issue_type",
    create_type=False,
)
issue_severity = postgresql.ENUM("LOW", "MEDIUM", "HIGH", name="issue_severity", create_type=False)
issue_status = postgresql.ENUM(
    "OPEN", "RESOLVED", "DISMISSED", name="issue_status", create_type=False
)
analysis_type = postgresql.ENUM(
    "FEEDBACK_ANALYSIS",
    "NEED_EXTRACTION",
    "REQUIREMENT_GENERATION",
    "REQUIREMENT_VALIDATION",
    "CONSISTENCY_CHECK",
    name="analysis_type",
    create_type=False,
)
analysis_status = postgresql.ENUM(
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    name="analysis_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in (
        feedback_status,
        user_need_status,
        requirement_status,
        generated_by_type,
        requirement_type,
        requirement_issue_type,
        issue_severity,
        issue_status,
        analysis_type,
        analysis_status,
    ):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("goal", sa.Text()),
        sa.Column("target_users", sa.Text()),
        sa.Column("platform", sa.String(100)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "feedback",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(255)),
        sa.Column("feedback_date", sa.DateTime(timezone=True)),
        sa.Column("category", sa.String(100)),
        sa.Column("is_noise", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("status", feedback_status, server_default="NEW", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feedback_project_id", "feedback", ["project_id"])
    op.create_index("ix_feedback_status", "feedback", ["status"])
    op.create_index("ix_feedback_category", "feedback", ["category"])
    op.create_table(
        "user_needs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", user_need_status, server_default="CANDIDATE", nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_needs_project_id", "user_needs", ["project_id"])
    op.create_index("ix_user_needs_status", "user_needs", ["status"])
    op.create_table(
        "feedback_need_links",
        sa.Column("feedback_id", sa.Uuid(), nullable=False),
        sa.Column("need_id", sa.Uuid(), nullable=False),
        sa.Column("relevance_score", sa.Numeric(5, 4)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["feedback_id"], ["feedback.id"]),
        sa.ForeignKeyConstraint(["need_id"], ["user_needs.id"]),
        sa.PrimaryKeyConstraint("feedback_id", "need_id"),
    )
    op.create_index("ix_feedback_need_links_need_id", "feedback_need_links", ["need_id"])
    op.create_table(
        "requirements",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("type", requirement_type, nullable=False),
        sa.Column("status", requirement_status, server_default="DRAFT", nullable=False),
        sa.Column("generated_by", generated_by_type, nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_requirements_project_id", "requirements", ["project_id"])
    op.create_index("ix_requirements_status", "requirements", ["status"])
    op.create_index("ix_requirements_type", "requirements", ["type"])
    op.create_table(
        "need_requirement_links",
        sa.Column("need_id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["need_id"], ["user_needs.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("need_id", "requirement_id"),
    )
    op.create_index(
        "ix_need_requirement_links_requirement_id", "need_requirement_links", ["requirement_id"]
    )
    op.create_table(
        "requirement_issues",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column("issue_type", requirement_issue_type, nullable=False),
        sa.Column("severity", issue_severity, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text()),
        sa.Column("suggestion", sa.Text()),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column("status", issue_status, server_default="OPEN", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_requirement_issues_requirement_id", "requirement_issues", ["requirement_id"]
    )
    op.create_index("ix_requirement_issues_issue_type", "requirement_issues", ["issue_type"])
    op.create_index("ix_requirement_issues_status", "requirement_issues", ["status"])
    op.create_table(
        "analysis_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("analysis_type", analysis_type, nullable=False),
        sa.Column("model", sa.String(255)),
        sa.Column("input_snapshot", postgresql.JSONB()),
        sa.Column("output_json", postgresql.JSONB()),
        sa.Column("status", analysis_status, server_default="PENDING", nullable=False),
        sa.Column("error_message", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_runs_project_id", "analysis_runs", ["project_id"])
    op.create_index("ix_analysis_runs_analysis_type", "analysis_runs", ["analysis_type"])
    op.create_index("ix_analysis_runs_status", "analysis_runs", ["status"])


def downgrade() -> None:
    op.drop_table("analysis_runs")
    op.drop_table("requirement_issues")
    op.drop_table("need_requirement_links")
    op.drop_table("requirements")
    op.drop_table("feedback_need_links")
    op.drop_table("user_needs")
    op.drop_table("feedback")
    op.drop_table("projects")
    bind = op.get_bind()
    for enum in (
        analysis_status,
        analysis_type,
        issue_status,
        issue_severity,
        requirement_issue_type,
        requirement_type,
        generated_by_type,
        requirement_status,
        user_need_status,
        feedback_status,
    ):
        enum.drop(bind, checkfirst=True)
