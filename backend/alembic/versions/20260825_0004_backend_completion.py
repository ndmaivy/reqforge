"""Complete membership, public feedback, metadata, and durable analysis schema.

Revision ID: 20260825_0004
Revises: 20260825_0003
Create Date: 2026-08-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260825_0004"
down_revision: str | None = "20260825_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

project_status = postgresql.ENUM("ACTIVE", "ARCHIVED", name="project_status", create_type=False)
project_role = postgresql.ENUM("OWNER", "EDITOR", "VIEWER", name="project_role", create_type=False)
requirement_source_type = postgresql.ENUM(
    "AI_FROM_USER_NEED",
    "MANUAL",
    "STAKEHOLDER",
    "POLICY",
    "COMPLIANCE",
    "EXISTING_SPECIFICATION",
    "TECHNICAL_CONSTRAINT",
    "OTHER",
    name="requirement_source_type",
    create_type=False,
)
consistency_type = postgresql.ENUM(
    "UNCOVERED_NEED",
    "REQUIREMENT_WITHOUT_EVIDENCE",
    "CONFLICT",
    "DUPLICATE",
    "INTENT_MISMATCH",
    "FEEDBACK_INCONSISTENCY",
    name="consistency_finding_type",
    create_type=False,
)
consistency_severity = postgresql.ENUM(
    "LOW", "MEDIUM", "HIGH", name="consistency_finding_severity", create_type=False
)
consistency_status = postgresql.ENUM(
    "OPEN", "RESOLVED", "DISMISSED", name="consistency_finding_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in (
        project_status,
        project_role,
        requirement_source_type,
        consistency_type,
        consistency_severity,
        consistency_status,
    ):
        enum.create(bind, checkfirst=True)

    op.add_column("projects", sa.Column("product_name", sa.String(255)))
    op.execute(
        """ALTER TABLE projects ALTER COLUMN target_users TYPE JSONB
        USING CASE WHEN target_users IS NULL OR btrim(target_users) = ''
        THEN '[]'::jsonb ELSE jsonb_build_array(target_users) END"""
    )
    op.alter_column(
        "projects", "target_users", nullable=False, server_default=sa.text("'[]'::jsonb")
    )
    op.add_column(
        "projects",
        sa.Column(
            "main_features",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column("projects", sa.Column("additional_context", sa.Text()))
    op.add_column(
        "projects", sa.Column("status", project_status, server_default="ACTIVE", nullable=False)
    )
    op.add_column("projects", sa.Column("archived_at", sa.DateTime(timezone=True)))

    op.create_table(
        "project_members",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", project_role, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
    )
    op.execute(
        "INSERT INTO project_members (project_id, user_id, role) "
        "SELECT id, owner_id, 'OWNER'::project_role FROM projects WHERE owner_id IS NOT NULL"
    )
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])
    op.create_index("ix_project_members_project_role", "project_members", ["project_id", "role"])
    op.create_index(
        "uq_project_members_one_owner",
        "project_members",
        ["project_id"],
        unique=True,
        postgresql_where=sa.text("role = 'OWNER'::project_role"),
    )

    op.add_column("analysis_runs", sa.Column("idempotency_key", sa.String(255)))
    op.add_column("analysis_runs", sa.Column("created_by_id", sa.Uuid()))
    op.add_column("analysis_runs", sa.Column("subject_requirement_id", sa.Uuid()))
    op.add_column("analysis_runs", sa.Column("error_code", sa.String(100)))
    op.add_column(
        "analysis_runs",
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "analysis_runs", sa.Column("max_attempts", sa.Integer(), server_default="3", nullable=False)
    )
    op.add_column("analysis_runs", sa.Column("started_at", sa.DateTime(timezone=True)))
    op.add_column("analysis_runs", sa.Column("heartbeat_at", sa.DateTime(timezone=True)))
    op.add_column("analysis_runs", sa.Column("next_attempt_at", sa.DateTime(timezone=True)))
    op.add_column(
        "analysis_runs",
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.execute("UPDATE analysis_runs SET idempotency_key = 'legacy-' || id::text")
    op.execute(
        "UPDATE analysis_runs a SET created_by_id = p.owner_id "
        "FROM projects p WHERE p.id = a.project_id"
    )
    op.alter_column("analysis_runs", "idempotency_key", nullable=False)
    op.create_foreign_key(
        "fk_analysis_runs_created_by", "analysis_runs", "users", ["created_by_id"], ["id"]
    )
    op.create_foreign_key(
        "fk_analysis_runs_subject_requirement",
        "analysis_runs",
        "requirements",
        ["subject_requirement_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_analysis_run_idempotency",
        "analysis_runs",
        ["project_id", "created_by_id", "idempotency_key"],
    )

    op.add_column("requirement_baselines", sa.Column("created_by_id", sa.Uuid()))
    op.execute(
        "UPDATE requirement_baselines b SET created_by_id = p.owner_id "
        "FROM projects p WHERE p.id = b.project_id"
    )
    op.create_foreign_key(
        "fk_requirement_baselines_created_by",
        "requirement_baselines",
        "users",
        ["created_by_id"],
        ["id"],
    )

    op.create_table(
        "public_feedback_forms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )
    op.create_index("ix_public_feedback_forms_project_id", "public_feedback_forms", ["project_id"])
    op.create_index(
        "ix_public_feedback_forms_token_hash", "public_feedback_forms", ["token_hash"], unique=True
    )

    for _name, column in (
        ("user_segment", sa.Column("user_segment", sa.String(255))),
        ("context", sa.Column("context", sa.Text())),
        ("notes", sa.Column("notes", sa.Text())),
        ("public_form_id", sa.Column("public_form_id", sa.Uuid())),
        ("submitted_by_id", sa.Column("submitted_by_id", sa.Uuid())),
        ("public_submission_key", sa.Column("public_submission_key", sa.String(255))),
        ("archived_at", sa.Column("archived_at", sa.DateTime(timezone=True))),
        ("archived_by_id", sa.Column("archived_by_id", sa.Uuid())),
    ):
        op.add_column("feedback", column)
    op.create_foreign_key(
        "fk_feedback_public_form",
        "feedback",
        "public_feedback_forms",
        ["public_form_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_feedback_submitted_by",
        "feedback",
        "users",
        ["submitted_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_feedback_archived_by",
        "feedback",
        "users",
        ["archived_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_feedback_form_submission_key",
        "feedback",
        ["public_form_id", "public_submission_key"],
    )

    op.add_column("user_needs", sa.Column("source_analysis_run_id", sa.Uuid()))
    op.add_column("user_needs", sa.Column("reviewed_by_id", sa.Uuid()))
    op.create_foreign_key(
        "fk_user_needs_source_run",
        "user_needs",
        "analysis_runs",
        ["source_analysis_run_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_user_needs_reviewer",
        "user_needs",
        "users",
        ["reviewed_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_user_needs_confidence_range",
        "user_needs",
        "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
    )

    op.add_column(
        "requirements",
        sa.Column("source_type", requirement_source_type, server_default="MANUAL", nullable=False),
    )
    op.add_column("requirements", sa.Column("source_reference", sa.String(500)))
    op.add_column("requirements", sa.Column("additional_context", sa.Text()))
    op.add_column("requirements", sa.Column("source_analysis_run_id", sa.Uuid()))
    op.add_column("requirements", sa.Column("reviewed_by_id", sa.Uuid()))
    op.add_column("requirements", sa.Column("review_note", sa.Text()))
    op.add_column(
        "requirements",
        sa.Column(
            "acknowledged_outdated_validation",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.add_column(
        "requirements",
        sa.Column(
            "acknowledged_open_high_issues",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.add_column("requirements", sa.Column("reviewed_at", sa.DateTime(timezone=True)))
    op.create_foreign_key(
        "fk_requirements_source_run",
        "requirements",
        "analysis_runs",
        ["source_analysis_run_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_requirements_reviewer",
        "requirements",
        "users",
        ["reviewed_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_requirements_confidence_range",
        "requirements",
        "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
    )

    op.add_column("requirement_issues", sa.Column("source_analysis_run_id", sa.Uuid()))
    op.add_column("requirement_issues", sa.Column("resolved_at", sa.DateTime(timezone=True)))
    op.add_column("requirement_issues", sa.Column("resolved_by_id", sa.Uuid()))
    op.add_column(
        "requirement_issues",
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_foreign_key(
        "fk_requirement_issues_source_run",
        "requirement_issues",
        "analysis_runs",
        ["source_analysis_run_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_requirement_issues_resolver",
        "requirement_issues",
        "users",
        ["resolved_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_requirement_issues_confidence_range",
        "requirement_issues",
        "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
    )
    op.create_check_constraint(
        "ck_feedback_need_relevance_range",
        "feedback_need_links",
        "relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1)",
    )

    op.create_table(
        "feedback_similarity_links",
        sa.Column("feedback_low_id", sa.Uuid(), nullable=False),
        sa.Column("feedback_high_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Numeric(5, 4), nullable=False),
        sa.Column("analysis_run_id", sa.Uuid()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "feedback_low_id <> feedback_high_id", name="ck_feedback_similarity_distinct"
        ),
        sa.CheckConstraint("score >= 0 AND score <= 1", name="ck_feedback_similarity_score_range"),
        sa.ForeignKeyConstraint(["feedback_low_id"], ["feedback.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["feedback_high_id"], ["feedback.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("feedback_low_id", "feedback_high_id"),
    )
    op.create_index(
        "ix_feedback_similarity_high_id", "feedback_similarity_links", ["feedback_high_id"]
    )

    op.create_table(
        "consistency_findings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("analysis_run_id", sa.Uuid(), nullable=False),
        sa.Column("need_id", sa.Uuid()),
        sa.Column("requirement_id", sa.Uuid()),
        sa.Column("finding_type", consistency_type, nullable=False),
        sa.Column("severity", consistency_severity, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text()),
        sa.Column("suggestion", sa.Text()),
        sa.Column("confidence", sa.Numeric(5, 4)),
        sa.Column("status", consistency_status, server_default="OPEN", nullable=False),
        sa.Column("resolved_by_id", sa.Uuid()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="ck_consistency_findings_confidence_range",
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["need_id"], ["user_needs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_consistency_findings_project_id", "consistency_findings", ["project_id"])
    op.create_index("ix_consistency_findings_status", "consistency_findings", ["status"])

    op.drop_constraint("fk_projects_owner_id_users", "projects", type_="foreignkey")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_column("projects", "owner_id")


def downgrade() -> None:
    raise RuntimeError("Backend completion migration is intentionally irreversible")
