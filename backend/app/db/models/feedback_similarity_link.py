from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import CreatedAtMixin


class FeedbackSimilarityLink(CreatedAtMixin, Base):
    __tablename__ = "feedback_similarity_links"
    __table_args__ = (
        CheckConstraint(
            "feedback_low_id <> feedback_high_id", name="ck_feedback_similarity_distinct"
        ),
        CheckConstraint("score >= 0 AND score <= 1", name="ck_feedback_similarity_score_range"),
        Index("ix_feedback_similarity_high_id", "feedback_high_id"),
    )

    feedback_low_id: Mapped[UUID] = mapped_column(
        ForeignKey("feedback.id", ondelete="CASCADE"), primary_key=True
    )
    feedback_high_id: Mapped[UUID] = mapped_column(
        ForeignKey("feedback.id", ondelete="CASCADE"), primary_key=True
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    analysis_run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="SET NULL")
    )

    feedback_low: Mapped[Feedback] = relationship(
        foreign_keys=[feedback_low_id], back_populates="similarity_links_low"
    )
    feedback_high: Mapped[Feedback] = relationship(
        foreign_keys=[feedback_high_id], back_populates="similarity_links_high"
    )


from app.db.models.feedback import Feedback  # noqa: E402
