from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.mixins import CreatedAtMixin


class NeedRequirementLink(CreatedAtMixin, Base):
    __tablename__ = "need_requirement_links"
    __table_args__ = (
        Index("ix_need_requirement_links_requirement_id", "requirement_id"),
    )

    need_id: Mapped[UUID] = mapped_column(ForeignKey("user_needs.id"), primary_key=True)
    requirement_id: Mapped[UUID] = mapped_column(ForeignKey("requirements.id"), primary_key=True)

    need: Mapped[UserNeed] = relationship(back_populates="requirement_links")
    requirement: Mapped[Requirement] = relationship(back_populates="need_links")


from app.db.models.requirement import Requirement  # noqa: E402
from app.db.models.user_need import UserNeed  # noqa: E402
