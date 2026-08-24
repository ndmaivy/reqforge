from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.db.models.enums import IssueStatus, RequirementStatus, RequirementType
from app.modules.requirements.schemas import (
    FeedbackEvidence,
    NeedEvidence,
    RequirementCreate,
    RequirementDetailResponse,
    RequirementEvidenceResponse,
    RequirementIssueResponse,
    RequirementResponse,
    RequirementUpdate,
)
from app.modules.requirements.service import RequirementService

project_router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["Requirements"])
router = APIRouter(tags=["Requirements"])


@project_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[RequirementResponse],
    summary="Create a manual requirement",
)
def create_requirement(
    project_id: UUID, payload: RequirementCreate, session: Session = Depends(get_session)
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).create(project_id, payload)
    return DataResponse(data=RequirementResponse.model_validate(requirement))


@project_router.get(
    "", response_model=ListResponse[RequirementResponse], summary="List requirements"
)
def list_requirements(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: RequirementStatus | None = Query(default=None, alias="status"),
    requirement_type: RequirementType | None = Query(default=None, alias="type"),
    search: str | None = None,
    has_open_issues: bool | None = None,
    session: Session = Depends(get_session),
) -> ListResponse[RequirementResponse]:
    items, total = RequirementService(session).list(
        project_id,
        page,
        page_size,
        status_filter,
        requirement_type,
        search,
        has_open_issues,
    )
    return ListResponse(
        data=[RequirementResponse.model_validate(item) for item in items],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/requirements/{requirement_id}",
    response_model=DataResponse[RequirementDetailResponse],
    summary="Get requirement detail",
)
def get_requirement(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementDetailResponse]:
    service = RequirementService(session)
    requirement = service.get(requirement_id, with_traceability=True)
    outdated, run_id = service.validation_state(requirement)
    data = RequirementResponse.model_validate(requirement).model_dump()
    needs = [
        NeedEvidence.model_validate(link.need, from_attributes=True)
        for link in requirement.need_links
    ]
    issues = [RequirementIssueResponse.model_validate(issue) for issue in requirement.issues]
    return DataResponse(
        data=RequirementDetailResponse(
            **data,
            needs=needs,
            issues=issues,
            validation_outdated=outdated,
            latest_validation_run_id=run_id,
        )
    )


@router.patch(
    "/requirements/{requirement_id}",
    response_model=DataResponse[RequirementResponse],
    summary="Edit a requirement awaiting review",
)
def update_requirement(
    requirement_id: UUID,
    payload: RequirementUpdate,
    session: Session = Depends(get_session),
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).update(requirement_id, payload)
    return DataResponse(data=RequirementResponse.model_validate(requirement))


def _requirement_action(
    requirement_id: UUID, action: str, session: Session
) -> DataResponse[RequirementResponse]:
    service = RequirementService(session)
    requirement = getattr(service, action)(requirement_id)
    return DataResponse(data=RequirementResponse.model_validate(requirement))


@router.post(
    "/requirements/{requirement_id}/approve",
    response_model=DataResponse[RequirementResponse],
    summary="Approve a requirement",
)
def approve_requirement(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementResponse]:
    return _requirement_action(requirement_id, "approve", session)


@router.post(
    "/requirements/{requirement_id}/reject",
    response_model=DataResponse[RequirementResponse],
    summary="Reject a requirement",
)
def reject_requirement(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementResponse]:
    return _requirement_action(requirement_id, "reject", session)


@router.post(
    "/requirements/{requirement_id}/archive",
    response_model=DataResponse[RequirementResponse],
    summary="Archive a requirement",
)
def archive_requirement(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementResponse]:
    return _requirement_action(requirement_id, "archive", session)


@router.get(
    "/requirements/{requirement_id}/issues",
    response_model=DataResponse[list[RequirementIssueResponse]],
    summary="List requirement validation findings",
)
def list_requirement_issues(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[list[RequirementIssueResponse]]:
    issues = RequirementService(session).list_issues(requirement_id)
    return DataResponse(data=[RequirementIssueResponse.model_validate(issue) for issue in issues])


@router.post(
    "/requirement-issues/{issue_id}/resolve",
    response_model=DataResponse[RequirementIssueResponse],
    summary="Resolve a requirement issue",
)
def resolve_issue(
    issue_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementIssueResponse]:
    issue = RequirementService(session).transition_issue(issue_id, IssueStatus.RESOLVED)
    return DataResponse(data=RequirementIssueResponse.model_validate(issue))


@router.post(
    "/requirement-issues/{issue_id}/dismiss",
    response_model=DataResponse[RequirementIssueResponse],
    summary="Dismiss a requirement issue",
)
def dismiss_issue(
    issue_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementIssueResponse]:
    issue = RequirementService(session).transition_issue(issue_id, IssueStatus.DISMISSED)
    return DataResponse(data=RequirementIssueResponse.model_validate(issue))


@router.get(
    "/requirements/{requirement_id}/evidence",
    response_model=DataResponse[RequirementEvidenceResponse],
    summary="Trace requirement source evidence",
)
def get_requirement_evidence(
    requirement_id: UUID, session: Session = Depends(get_session)
) -> DataResponse[RequirementEvidenceResponse]:
    requirement = RequirementService(session).get(requirement_id, with_traceability=True)
    needs = []
    feedback_by_id = {}
    for link in requirement.need_links:
        needs.append(NeedEvidence.model_validate(link.need, from_attributes=True))
        for feedback_link in link.need.feedback_links:
            item = feedback_link.feedback
            feedback_by_id[item.id] = FeedbackEvidence.model_validate(item, from_attributes=True)
    return DataResponse(
        data=RequirementEvidenceResponse(
            requirement_id=requirement.id,
            needs=needs,
            feedback=list(feedback_by_id.values()),
        )
    )
