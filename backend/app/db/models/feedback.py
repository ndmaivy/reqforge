from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import FeedbackStatus
from app.db.models.mixins import TimestampMixin


class Feedback(TimestampMixin, Base):
    __tablename__ = "feedback"
    __table_args__ = (
        Index("ix_feedback_project_id", "project_id"),
        Index("ix_feedback_status", "status"),
        Index("ix_feedback_category", "category"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(255))
    feedback_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    category: Mapped[str | None] = mapped_column(String(100))
    is_noise: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    status: Mapped[FeedbackStatus] = mapped_column(
        Enum(FeedbackStatus, name="feedback_status"),
        nullable=False,
        default=FeedbackStatus.NEW,
        server_default=FeedbackStatus.NEW.value,
    )

    project: Mapped[Project] = relationship(back_populates="feedback_items")
    need_links: Mapped[list[FeedbackNeedLink]] = relationship(back_populates="feedback")


from app.db.models.feedback_need_link import FeedbackNeedLink  # noqa: E402
from app.db.models.project import Project  # noqa: E402
