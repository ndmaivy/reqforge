from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ProjectNotFound
from app.db.models import Project
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ProjectRepository(session)

    def create(self, payload: ProjectCreate) -> Project:
        project = self.repository.create(Project(**payload.model_dump()))
        self.session.commit()
        self.session.refresh(project)
        return project

    def get(self, project_id: UUID) -> Project:
        project = self.repository.get(project_id)
        if project is None:
            raise ProjectNotFound("Project not found")
        return project

    def list(self, page: int, page_size: int) -> tuple[list[Project], int]:
        return self.repository.list(page, page_size)

    def update(self, project_id: UUID, payload: ProjectUpdate) -> Project:
        project = self.get(project_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        self.session.commit()
        self.session.refresh(project)
        return project
