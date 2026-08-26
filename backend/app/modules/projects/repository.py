from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Project, ProjectMember, User


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, project: Project) -> Project:
        self.session.add(project)
        return project

    def get(self, project_id: UUID) -> Project | None:
        return self.session.scalar(
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.members).selectinload(ProjectMember.user))
        )

    def membership(self, project_id: UUID, user_id: UUID) -> ProjectMember | None:
        return self.session.get(ProjectMember, (project_id, user_id))

    def list(self, page: int, page_size: int, user_id: UUID) -> tuple[list[Project], int]:
        filters = [ProjectMember.user_id == user_id]
        statement = (
            select(Project)
            .join(ProjectMember)
            .where(*filters)
            .order_by(Project.created_at.desc())
            .offset((page - 1) * page_size)
        )
        projects = list(self.session.scalars(statement.limit(page_size)))
        total = (
            self.session.scalar(
                select(func.count()).select_from(Project).join(ProjectMember).where(*filters)
            )
            or 0
        )
        return projects, total

    def user_by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email.strip().lower()))

    def members(self, project_id: UUID) -> list[ProjectMember]:
        return list(
            self.session.scalars(
                select(ProjectMember)
                .where(ProjectMember.project_id == project_id)
                .options(selectinload(ProjectMember.user))
                .order_by(ProjectMember.created_at)
            )
        )
