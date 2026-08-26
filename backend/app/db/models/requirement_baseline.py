from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import CreatedAtMixin


class RequirementBaseline(CreatedAtMixin, Base):
    __tablename__ = "requirement_baselines"
    __table_args__ = (
        UniqueConstraint("project_id", "version", name="uq_requirement_baselines_project_version"),
        Index("ix_requirement_baselines_project_id", "project_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON(), nullable=False)
    created_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))

    project: Mapped[Project] = relationship(back_populates="baselines")


from app.db.models.project import Project  # noqa: E402
