from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import CreatedAtMixin


class FeedbackNeedLink(CreatedAtMixin, Base):
    __tablename__ = "feedback_need_links"
    __table_args__ = (
        Index("ix_feedback_need_links_need_id", "need_id"),
        CheckConstraint(
            "relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1)",
            name="ck_feedback_need_relevance_range",
        ),
    )

    feedback_id: Mapped[UUID] = mapped_column(ForeignKey("feedback.id"), primary_key=True)
    need_id: Mapped[UUID] = mapped_column(ForeignKey("user_needs.id"), primary_key=True)
    relevance_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    feedback: Mapped[Feedback] = relationship(back_populates="need_links")
    need: Mapped[UserNeed] = relationship(back_populates="feedback_links")


from app.db.models.feedback import Feedback  # noqa: E402
from app.db.models.user_need import UserNeed  # noqa: E402
