from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
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
        UniqueConstraint(
            "public_form_id",
            "public_submission_key",
            name="uq_feedback_form_submission_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(255))
    user_segment: Mapped[str | None] = mapped_column(String(255))
    context: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
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
    public_form_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("public_feedback_forms.id", ondelete="SET NULL")
    )
    submitted_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    public_submission_key: Mapped[str | None] = mapped_column(String(255))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    project: Mapped[Project] = relationship(back_populates="feedback_items")
    need_links: Mapped[list[FeedbackNeedLink]] = relationship(back_populates="feedback")
    similarity_links_low: Mapped[list[FeedbackSimilarityLink]] = relationship(
        foreign_keys="FeedbackSimilarityLink.feedback_low_id", back_populates="feedback_low"
    )
    similarity_links_high: Mapped[list[FeedbackSimilarityLink]] = relationship(
        foreign_keys="FeedbackSimilarityLink.feedback_high_id", back_populates="feedback_high"
    )


from app.db.models.feedback_need_link import FeedbackNeedLink  # noqa: E402
from app.db.models.feedback_similarity_link import FeedbackSimilarityLink  # noqa: E402
from app.db.models.project import Project  # noqa: E402
