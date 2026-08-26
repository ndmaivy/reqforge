from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models import User
from app.modules.projects.schemas import (
    OwnershipTransfer,
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectResponse,
    ProjectUpdate,
)
from app.modules.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


def _member_response(member) -> ProjectMemberResponse:
    return ProjectMemberResponse(
        id=member.user_id,
        email=member.user.email,
        full_name=member.user.full_name,
        role=member.role,
        joined_at=member.created_at,
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[ProjectResponse],
    summary="Create a project",
)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).create(payload, current_user.id)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.get("", response_model=ListResponse[ProjectResponse], summary="List projects")
def list_projects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ListResponse[ProjectResponse]:
    projects, total = ProjectService(session).list(page, page_size, current_user.id)
    return ListResponse(
        data=[ProjectResponse.model_validate(project) for project in projects],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/{project_id}",
    response_model=DataResponse[ProjectResponse],
    summary="Get project detail",
)
def get_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).get(project_id, current_user.id)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.patch(
    "/{project_id}",
    response_model=DataResponse[ProjectResponse],
    summary="Update a project",
)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).update(project_id, payload, current_user.id)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.post(
    "/{project_id}/archive",
    response_model=DataResponse[ProjectResponse],
    summary="Archive a project",
)
def archive_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).archive(project_id, current_user.id)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.get(
    "/{project_id}/members",
    response_model=DataResponse[list[ProjectMemberResponse]],
    summary="List project members",
)
def list_members(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[list[ProjectMemberResponse]]:
    members = ProjectService(session).list_members(project_id, current_user.id)
    return DataResponse(data=[_member_response(member) for member in members])


@router.post(
    "/{project_id}/members",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[ProjectMemberResponse],
    summary="Add a registered user to a project",
)
def add_member(
    project_id: UUID,
    payload: ProjectMemberCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectMemberResponse]:
    member = ProjectService(session).add_member(
        project_id, payload.email, payload.role, current_user.id
    )
    return DataResponse(data=_member_response(member))


@router.patch(
    "/{project_id}/members/{member_id}",
    response_model=DataResponse[ProjectMemberResponse],
    summary="Change a project member role",
)
def update_member(
    project_id: UUID,
    member_id: UUID,
    payload: ProjectMemberUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[ProjectMemberResponse]:
    member = ProjectService(session).update_member(
        project_id, member_id, payload.role, current_user.id
    )
    return DataResponse(data=_member_response(member))


@router.delete(
    "/{project_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a project member",
)
def remove_member(
    project_id: UUID,
    member_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    ProjectService(session).remove_member(project_id, member_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{project_id}/ownership-transfer",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Transfer project ownership",
)
def transfer_ownership(
    project_id: UUID,
    payload: OwnershipTransfer,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    ProjectService(session).transfer_ownership(project_id, payload.user_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{project_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Leave a project",
)
def leave_project(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    ProjectService(session).leave(project_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
