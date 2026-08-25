"""Add immutable requirement baseline snapshots.

Revision ID: 20260825_0003
Revises: 20260825_0002
Create Date: 2026-08-25
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260825_0003"
down_revision: str | None = "20260825_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "requirement_baselines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "version", name="uq_requirement_baselines_project_version"
        ),
    )
    op.create_index(
        "ix_requirement_baselines_project_id", "requirement_baselines", ["project_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_requirement_baselines_project_id", table_name="requirement_baselines")
    op.drop_table("requirement_baselines")
