from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Project


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, project: Project) -> Project:
        self.session.add(project)
        return project

    def get(self, project_id: UUID, owner_id: UUID | None = None) -> Project | None:
        statement = select(Project).where(Project.id == project_id)
        if owner_id is not None:
            statement = statement.where(Project.owner_id == owner_id)
        return self.session.scalar(statement)

    def list(
        self, page: int, page_size: int, owner_id: UUID | None = None
    ) -> tuple[list[Project], int]:
        filters = []
        if owner_id is not None:
            filters.append(Project.owner_id == owner_id)
        statement = (
            select(Project)
            .where(*filters)
            .order_by(Project.created_at.desc())
            .offset((page - 1) * page_size)
        )
        projects = list(self.session.scalars(statement.limit(page_size)))
        total = self.session.scalar(select(func.count()).select_from(Project).where(*filters)) or 0
        return projects, total
