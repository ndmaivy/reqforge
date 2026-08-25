from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (Index("ix_projects_owner_id", "owner_id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    goal: Mapped[str | None] = mapped_column(Text)
    target_users: Mapped[str | None] = mapped_column(Text)
    platform: Mapped[str | None] = mapped_column(String(100))

    owner: Mapped[User | None] = relationship(back_populates="projects")
    feedback_items: Mapped[list[Feedback]] = relationship(back_populates="project")
    user_needs: Mapped[list[UserNeed]] = relationship(back_populates="project")
    requirements: Mapped[list[Requirement]] = relationship(back_populates="project")
    analysis_runs: Mapped[list[AnalysisRun]] = relationship(back_populates="project")
    baselines: Mapped[list[RequirementBaseline]] = relationship(back_populates="project")


from app.db.models.analysis_run import AnalysisRun  # noqa: E402
from app.db.models.feedback import Feedback  # noqa: E402
from app.db.models.requirement import Requirement  # noqa: E402
from app.db.models.requirement_baseline import RequirementBaseline  # noqa: E402
from app.db.models.user import User  # noqa: E402
from app.db.models.user_need import UserNeed  # noqa: E402
