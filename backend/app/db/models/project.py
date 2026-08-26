from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import ProjectStatus
from app.db.models.mixins import TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    goal: Mapped[str | None] = mapped_column(Text)
    target_users: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list,
        server_default="[]",
    )
    platform: Mapped[str | None] = mapped_column(String(100))
    main_features: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list,
        server_default="[]",
    )
    additional_context: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.ACTIVE,
        server_default=ProjectStatus.ACTIVE.value,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    members: Mapped[list[ProjectMember]] = relationship(back_populates="project")
    feedback_items: Mapped[list[Feedback]] = relationship(back_populates="project")
    user_needs: Mapped[list[UserNeed]] = relationship(back_populates="project")
    requirements: Mapped[list[Requirement]] = relationship(back_populates="project")
    analysis_runs: Mapped[list[AnalysisRun]] = relationship(back_populates="project")
    baselines: Mapped[list[RequirementBaseline]] = relationship(back_populates="project")


from app.db.models.analysis_run import AnalysisRun  # noqa: E402
from app.db.models.feedback import Feedback  # noqa: E402
from app.db.models.project_member import ProjectMember  # noqa: E402
from app.db.models.requirement import Requirement  # noqa: E402
from app.db.models.requirement_baseline import RequirementBaseline  # noqa: E402
from app.db.models.user_need import UserNeed  # noqa: E402
