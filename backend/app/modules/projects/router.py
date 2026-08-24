from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.modules.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from app.modules.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[ProjectResponse],
    summary="Create a project",
)
def create_project(
    payload: ProjectCreate, session: Session = Depends(get_session)
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).create(payload)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.get("", response_model=ListResponse[ProjectResponse], summary="List projects")
def list_projects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> ListResponse[ProjectResponse]:
    projects, total = ProjectService(session).list(page, page_size)
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
    project_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).get(project_id)
    return DataResponse(data=ProjectResponse.model_validate(project))


@router.patch(
    "/{project_id}",
    response_model=DataResponse[ProjectResponse],
    summary="Update a project",
)
def update_project(
    project_id: UUID, payload: ProjectUpdate, session: Session = Depends(get_session)
) -> DataResponse[ProjectResponse]:
    project = ProjectService(session).update(project_id, payload)
    return DataResponse(data=ProjectResponse.model_validate(project))
