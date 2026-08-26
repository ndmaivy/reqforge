from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.enums import ConsistencyFindingType, IssueSeverity, IssueStatus
from app.db.models.mixins import TimestampMixin


class ConsistencyFinding(TimestampMixin, Base):
    __tablename__ = "consistency_findings"
    __table_args__ = (
        Index("ix_consistency_findings_project_id", "project_id"),
        Index("ix_consistency_findings_status", "status"),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="ck_consistency_findings_confidence_range",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    need_id: Mapped[UUID | None] = mapped_column(ForeignKey("user_needs.id", ondelete="CASCADE"))
    requirement_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE")
    )
    finding_type: Mapped[ConsistencyFindingType] = mapped_column(
        Enum(ConsistencyFindingType, name="consistency_finding_type"), nullable=False
    )
    severity: Mapped[IssueSeverity] = mapped_column(
        Enum(IssueSeverity, name="consistency_finding_severity"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str | None] = mapped_column(Text)
    suggestion: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="consistency_finding_status"),
        nullable=False,
        default=IssueStatus.OPEN,
        server_default=IssueStatus.OPEN.value,
    )
    resolved_by_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
