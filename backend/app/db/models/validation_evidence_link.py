from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.enums import ValidationEvidenceOrigin, ValidationEvidenceRelation
from app.db.models.mixins import CreatedAtMixin


class ValidationEvidenceLink(CreatedAtMixin, Base):
    """Evidence snapshot captured for one requirement validation run."""

    __tablename__ = "validation_evidence_links"
    __table_args__ = (
        Index("ix_validation_evidence_links_run_id", "analysis_run_id"),
        Index("ix_validation_evidence_links_requirement_id", "requirement_id"),
        Index("ix_validation_evidence_links_feedback_id", "feedback_id"),
        CheckConstraint(
            "retrieval_score IS NULL OR (retrieval_score >= 0 AND retrieval_score <= 1)",
            name="ck_validation_evidence_retrieval_score_range",
        ),
        CheckConstraint(
            "character_similarity_score IS NULL OR "
            "(character_similarity_score >= 0 AND character_similarity_score <= 1)",
            name="ck_validation_evidence_character_score_range",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    analysis_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    requirement_id: Mapped[UUID] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False
    )
    user_need_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user_needs.id", ondelete="SET NULL")
    )
    feedback_id: Mapped[UUID] = mapped_column(
        ForeignKey("feedback.id", ondelete="RESTRICT"), nullable=False
    )
    evidence_origin: Mapped[ValidationEvidenceOrigin] = mapped_column(
        Enum(ValidationEvidenceOrigin, name="validation_evidence_origin"), nullable=False
    )
    retrieval_method: Mapped[str | None] = mapped_column(Text)
    retrieval_rank: Mapped[int | None] = mapped_column(Integer)
    retrieval_score: Mapped[Decimal | None] = mapped_column(Numeric(8, 7))
    character_similarity_score: Mapped[Decimal | None] = mapped_column(Numeric(8, 7))
    validation_relation: Mapped[ValidationEvidenceRelation | None] = mapped_column(
        Enum(ValidationEvidenceRelation, name="validation_evidence_relation")
    )
    validation_rationale: Mapped[str | None] = mapped_column(Text)
