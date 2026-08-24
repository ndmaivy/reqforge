from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.enums import GeneratedByType, RequirementStatus, RequirementType
from app.db.models.mixins import TimestampMixin


class Requirement(TimestampMixin, Base):
    __tablename__ = "requirements"
    __table_args__ = (
        Index("ix_requirements_project_id", "project_id"),
        Index("ix_requirements_status", "status"),
        Index("ix_requirements_type", "type"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[RequirementType] = mapped_column(
        Enum(RequirementType, name="requirement_type"), nullable=False
    )
    status: Mapped[RequirementStatus] = mapped_column(
        Enum(RequirementStatus, name="requirement_status"),
        nullable=False,
        default=RequirementStatus.DRAFT,
        server_default=RequirementStatus.DRAFT.value,
    )
    generated_by: Mapped[GeneratedByType] = mapped_column(
        Enum(GeneratedByType, name="generated_by_type"), nullable=False
    )
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))

    project: Mapped[Project] = relationship(back_populates="requirements")
    need_links: Mapped[list[NeedRequirementLink]] = relationship(back_populates="requirement")
    issues: Mapped[list[RequirementIssue]] = relationship(back_populates="requirement")


from app.db.models.need_requirement_link import NeedRequirementLink  # noqa: E402
from app.db.models.project import Project  # noqa: E402
from app.db.models.requirement_issue import RequirementIssue  # noqa: E402
