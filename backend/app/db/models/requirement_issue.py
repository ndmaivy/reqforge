from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Enum, ForeignKey, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import IssueSeverity, IssueStatus, RequirementIssueType
from app.db.models.mixins import CreatedAtMixin


class RequirementIssue(CreatedAtMixin, Base):
    __tablename__ = "requirement_issues"
    __table_args__ = (
        Index("ix_requirement_issues_requirement_id", "requirement_id"),
        Index("ix_requirement_issues_issue_type", "issue_type"),
        Index("ix_requirement_issues_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    requirement_id: Mapped[UUID] = mapped_column(ForeignKey("requirements.id"), nullable=False)
    issue_type: Mapped[RequirementIssueType] = mapped_column(
        Enum(RequirementIssueType, name="requirement_issue_type"), nullable=False
    )
    severity: Mapped[IssueSeverity] = mapped_column(
        Enum(IssueSeverity, name="issue_severity"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str | None] = mapped_column(Text)
    suggestion: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="issue_status"),
        nullable=False,
        default=IssueStatus.OPEN,
        server_default=IssueStatus.OPEN.value,
    )

    requirement: Mapped[Requirement] = relationship(back_populates="issues")


from app.db.models.requirement import Requirement  # noqa: E402
