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

    def get(self, project_id: UUID) -> Project | None:
        return self.session.get(Project, project_id)

    def list(self, page: int, page_size: int) -> tuple[list[Project], int]:
        statement = (
            select(Project).order_by(Project.created_at.desc()).offset((page - 1) * page_size)
        )
        projects = list(self.session.scalars(statement.limit(page_size)))
        total = self.session.scalar(select(func.count()).select_from(Project)) or 0
        return projects, total
