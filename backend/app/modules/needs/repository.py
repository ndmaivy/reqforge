from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import FeedbackNeedLink, UserNeed
from app.db.models.enums import UserNeedStatus


class UserNeedRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, need: UserNeed) -> UserNeed:
        self.session.add(need)
        return need

    def get(self, need_id: UUID, with_evidence: bool = False) -> UserNeed | None:
        statement = select(UserNeed).where(UserNeed.id == need_id)
        if with_evidence:
            statement = statement.options(
                selectinload(UserNeed.feedback_links).selectinload(FeedbackNeedLink.feedback)
            )
        return self.session.scalar(statement)

    def list(
        self,
        project_id: UUID,
        page: int,
        page_size: int,
        status: UserNeedStatus | None,
        search: str | None,
    ) -> tuple[list[UserNeed], int]:
        filters = [UserNeed.project_id == project_id]
        if status:
            filters.append(UserNeed.status == status)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(UserNeed.title.ilike(pattern) | UserNeed.description.ilike(pattern))
        statement = select(UserNeed).where(*filters).order_by(UserNeed.created_at.desc())
        items = list(
            self.session.scalars(statement.offset((page - 1) * page_size).limit(page_size))
        )
        total = self.session.scalar(select(func.count()).select_from(UserNeed).where(*filters)) or 0
        return items, total
