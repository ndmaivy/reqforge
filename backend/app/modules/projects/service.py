from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import (
    AuthorizationError,
    DuplicateResource,
    InvalidStateTransition,
    MemberNotFound,
    ProjectNotFound,
)
from app.db.models import Project, ProjectMember
from app.db.models.enums import ProjectRole, ProjectStatus
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import ProjectCreate, ProjectUpdate

ROLE_LEVEL = {ProjectRole.VIEWER: 1, ProjectRole.EDITOR: 2, ProjectRole.OWNER: 3}


class ProjectService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ProjectRepository(session)

    def create(self, payload: ProjectCreate, owner_id: UUID) -> Project:
        project = self.repository.create(Project(**payload.model_dump()))
        self.session.flush()
        self.session.add(
            ProjectMember(project_id=project.id, user_id=owner_id, role=ProjectRole.OWNER)
        )
        self.session.commit()
        self.session.refresh(project)
        project.current_user_role = ProjectRole.OWNER
        return project

    def get(
        self,
        project_id: UUID,
        user_id: UUID | None = None,
        minimum_role: ProjectRole = ProjectRole.VIEWER,
    ) -> Project:
        project = self.repository.get(project_id)
        if project is None:
            raise ProjectNotFound("Project not found")
        if user_id is None:
            return project
        membership = self.repository.membership(project_id, user_id)
        if membership is None:
            raise ProjectNotFound("Project not found")
        if ROLE_LEVEL[membership.role] < ROLE_LEVEL[minimum_role]:
            raise AuthorizationError(f"{minimum_role.value} role or higher is required")
        if (
            project.status is ProjectStatus.ARCHIVED
            and ROLE_LEVEL[minimum_role] >= ROLE_LEVEL[ProjectRole.EDITOR]
        ):
            raise InvalidStateTransition("Archived projects are read-only")
        project.current_user_role = membership.role
        return project

    def list(self, page: int, page_size: int, user_id: UUID) -> tuple[list[Project], int]:
        projects, total = self.repository.list(page, page_size, user_id)
        for project in projects:
            membership = self.repository.membership(project.id, user_id)
            project.current_user_role = membership.role if membership else None
        return projects, total

    def update(self, project_id: UUID, payload: ProjectUpdate, user_id: UUID) -> Project:
        project = self.get(project_id, user_id, ProjectRole.EDITOR)
        if project.status is ProjectStatus.ARCHIVED:
            raise InvalidStateTransition("Archived projects cannot be edited")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        self.session.commit()
        self.session.refresh(project)
        return project

    def archive(self, project_id: UUID, user_id: UUID) -> Project:
        project = self.get(project_id, user_id, ProjectRole.OWNER)
        if project.status is ProjectStatus.ARCHIVED:
            raise InvalidStateTransition("Project is already archived")
        project.status = ProjectStatus.ARCHIVED
        project.archived_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(project)
        return project

    def list_members(self, project_id: UUID, user_id: UUID) -> list[ProjectMember]:
        self.get(project_id, user_id)
        return self.repository.members(project_id)

    def add_member(
        self, project_id: UUID, email: str, role: ProjectRole, actor_id: UUID
    ) -> ProjectMember:
        self.get(project_id, actor_id, ProjectRole.OWNER)
        user = self.repository.user_by_email(email)
        if user is None:
            raise MemberNotFound("A registered user with that email was not found")
        if self.repository.membership(project_id, user.id) is not None:
            raise DuplicateResource("User is already a project member")
        membership = ProjectMember(project_id=project_id, user_id=user.id, role=role)
        self.session.add(membership)
        self.session.commit()
        self.session.refresh(membership)
        return membership

    def update_member(
        self, project_id: UUID, member_id: UUID, role: ProjectRole, actor_id: UUID
    ) -> ProjectMember:
        self.get(project_id, actor_id, ProjectRole.OWNER)
        membership = self.repository.membership(project_id, member_id)
        if membership is None:
            raise MemberNotFound("Project member not found")
        if membership.role is ProjectRole.OWNER:
            raise InvalidStateTransition("Transfer ownership before changing the owner role")
        membership.role = role
        self.session.commit()
        self.session.refresh(membership)
        return membership

    def remove_member(self, project_id: UUID, member_id: UUID, actor_id: UUID) -> None:
        self.get(project_id, actor_id, ProjectRole.OWNER)
        membership = self.repository.membership(project_id, member_id)
        if membership is None:
            raise MemberNotFound("Project member not found")
        if membership.role is ProjectRole.OWNER:
            raise InvalidStateTransition("Transfer ownership before removing the owner")
        self.session.delete(membership)
        self.session.commit()

    def leave(self, project_id: UUID, user_id: UUID) -> None:
        membership = self.repository.membership(project_id, user_id)
        if membership is None:
            raise ProjectNotFound("Project not found")
        if membership.role is ProjectRole.OWNER:
            raise InvalidStateTransition("Transfer ownership before leaving the project")
        self.session.delete(membership)
        self.session.commit()

    def transfer_ownership(self, project_id: UUID, new_owner_id: UUID, actor_id: UUID) -> None:
        self.get(project_id, actor_id, ProjectRole.OWNER)
        target = self.repository.membership(project_id, new_owner_id)
        current = self.repository.membership(project_id, actor_id)
        if target is None:
            raise MemberNotFound("New owner must already be a project member")
        if target.role is not ProjectRole.EDITOR:
            raise InvalidStateTransition("Ownership can only be transferred to an editor")
        if new_owner_id == actor_id:
            raise InvalidStateTransition("User already owns this project")
        assert current is not None
        current.role = ProjectRole.EDITOR
        self.session.flush()
        target.role = ProjectRole.OWNER
        self.session.commit()
