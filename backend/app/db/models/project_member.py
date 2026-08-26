from __future__ import annotations

from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import ProjectRole
from app.db.models.mixins import TimestampMixin


class ProjectMember(TimestampMixin, Base):
    __tablename__ = "project_members"
    __table_args__ = (
        Index("ix_project_members_user_id", "user_id"),
        Index("ix_project_members_project_role", "project_id", "role"),
        Index(
            "uq_project_members_one_owner",
            "project_id",
            unique=True,
            postgresql_where=text("role = 'OWNER'"),
            sqlite_where=text("role = 'OWNER'"),
        ),
    )

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, name="project_role"), nullable=False
    )

    project: Mapped[Project] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="project_memberships")


from app.db.models.project import Project  # noqa: E402
from app.db.models.user import User  # noqa: E402
