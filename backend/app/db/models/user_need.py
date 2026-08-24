from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import UserNeedStatus
from app.db.models.mixins import TimestampMixin


class UserNeed(TimestampMixin, Base):
    __tablename__ = "user_needs"
    __table_args__ = (
        Index("ix_user_needs_project_id", "project_id"),
        Index("ix_user_needs_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[UserNeedStatus] = mapped_column(
        Enum(UserNeedStatus, name="user_need_status"),
        nullable=False,
        default=UserNeedStatus.CANDIDATE,
        server_default=UserNeedStatus.CANDIDATE.value,
    )
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    project: Mapped[Project] = relationship(back_populates="user_needs")
    feedback_links: Mapped[list[FeedbackNeedLink]] = relationship(back_populates="need")
    requirement_links: Mapped[list[NeedRequirementLink]] = relationship(back_populates="need")


from app.db.models.feedback_need_link import FeedbackNeedLink  # noqa: E402
from app.db.models.need_requirement_link import NeedRequirementLink  # noqa: E402
from app.db.models.project import Project  # noqa: E402
