from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse, ListResponse, PageMeta
from app.core.exceptions import InvalidStateTransition, RequirementIssueNotFound
from app.db.models import Project, RequirementIssue, User
from app.db.models.enums import IssueStatus, RequirementStatus, RequirementType
from app.modules.analysis.dispatcher import AnalysisDispatcher
from app.modules.requirements.schemas import (
    FeedbackEvidence,
    NeedEvidence,
    RequirementApprovalRequest,
    RequirementCreate,
    RequirementDetailResponse,
    RequirementEvidenceResponse,
    RequirementIssueResponse,
    RequirementResponse,
    RequirementRevisionSuggestionRequest,
    RequirementRevisionSuggestionResponse,
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
    project_id: UUID,
    payload: RequirementCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).create(project_id, payload, current_user.id)
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
    current_user: User = Depends(get_current_user),
) -> ListResponse[RequirementResponse]:
    items, total = RequirementService(session).list(
        project_id,
        page,
        page_size,
        status_filter,
        requirement_type,
        search,
        has_open_issues,
        current_user.id,
    )
    return ListResponse(
        data=[RequirementResponse.model_validate(item) for item in items],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@project_router.get(
    "/{requirement_id}",
    response_model=DataResponse[RequirementDetailResponse],
    summary="Get requirement detail",
)
def get_requirement(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementDetailResponse]:
    service = RequirementService(session)
    requirement = service.get(
        requirement_id,
        with_traceability=True,
        project_id=project_id,
        user_id=current_user.id,
    )
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


@project_router.post(
    "/{requirement_id}/revision-suggestion",
    response_model=DataResponse[RequirementRevisionSuggestionResponse],
    summary="Create a consolidated requirement revision suggestion",
)
async def create_revision_suggestion(
    project_id: UUID,
    requirement_id: UUID,
    payload: RequirementRevisionSuggestionRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementRevisionSuggestionResponse]:
    service = RequirementService(session)
    requirement = service.get(
        requirement_id,
        with_traceability=True,
        project_id=project_id,
        user_id=current_user.id,
    )
    outdated, run_id = service.validation_state(requirement)
    if outdated or run_id is None:
        raise InvalidStateTransition("A current validation result is required")
    issues = list(
        session.scalars(select(RequirementIssue).where(RequirementIssue.id.in_(payload.issue_ids)))
    )
    if len(issues) != len(set(payload.issue_ids)) or any(
        issue.requirement_id != requirement.id
        or issue.status is not IssueStatus.OPEN
        or issue.source_analysis_run_id != run_id
        for issue in issues
    ):
        raise RequirementIssueNotFound(
            "One or more selected issues are not current for this requirement"
        )
    project = session.get(Project, project_id)
    needs = [link.need for link in requirement.need_links]
    feedback = {
        link.feedback.id: link.feedback
        for need in needs
        for link in need.feedback_links
    }
    context = {
        "project": AnalysisDispatcher._project_data(project),
        "requirement": AnalysisDispatcher._requirement_data(requirement),
        "needs": [AnalysisDispatcher._need_data(need) for need in needs],
        "feedback": [AnalysisDispatcher._feedback_data(item) for item in feedback.values()],
        "selected_issues": [
            {
                "id": str(issue.id),
                "type": issue.issue_type.value,
                "severity": issue.severity.value,
                "description": issue.description,
                "evidence": issue.evidence,
                "suggested_change": issue.suggested_change or issue.suggestion,
                "suggested_requirement": issue.suggested_requirement,
            }
            for issue in issues
        ],
    }
    output = await request.app.state.ai_client.create_requirement_revision(context)
    return DataResponse(
        data=RequirementRevisionSuggestionResponse(
            current_requirement=requirement.description,
            suggested_requirement=output.suggested_requirement,
            addressed_issues=[issue.id for issue in issues],
            conflict=output.conflict,
        )
    )


@project_router.patch(
    "/{requirement_id}",
    response_model=DataResponse[RequirementResponse],
    summary="Edit a requirement awaiting review",
)
def update_requirement(
    project_id: UUID,
    requirement_id: UUID,
    payload: RequirementUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).update(
        project_id, requirement_id, payload, current_user.id
    )
    return DataResponse(data=RequirementResponse.model_validate(requirement))


def _requirement_action(
    project_id: UUID, requirement_id: UUID, action: str, session: Session, user_id: UUID
) -> DataResponse[RequirementResponse]:
    service = RequirementService(session)
    requirement = getattr(service, action)(project_id, requirement_id, user_id)
    return DataResponse(data=RequirementResponse.model_validate(requirement))


@project_router.post(
    "/{requirement_id}/approve",
    response_model=DataResponse[RequirementResponse],
    summary="Approve a requirement",
)
def approve_requirement(
    project_id: UUID,
    requirement_id: UUID,
    payload: RequirementApprovalRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).approve(
        project_id, requirement_id, payload, current_user.id
    )
    return DataResponse(data=RequirementResponse.model_validate(requirement))


@project_router.post(
    "/{requirement_id}/reopen",
    response_model=DataResponse[RequirementResponse],
    summary="Reopen an approved requirement for editing",
)
def reopen_requirement(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    requirement = RequirementService(session).reopen(project_id, requirement_id, current_user.id)
    return DataResponse(data=RequirementResponse.model_validate(requirement))


@project_router.post(
    "/{requirement_id}/reject",
    response_model=DataResponse[RequirementResponse],
    summary="Reject a requirement",
)
def reject_requirement(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    return _requirement_action(project_id, requirement_id, "reject", session, current_user.id)


@project_router.post(
    "/{requirement_id}/archive",
    response_model=DataResponse[RequirementResponse],
    summary="Archive a requirement",
)
def archive_requirement(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementResponse]:
    return _requirement_action(project_id, requirement_id, "archive", session, current_user.id)


@project_router.get(
    "/{requirement_id}/issues",
    response_model=DataResponse[list[RequirementIssueResponse]],
    summary="List requirement validation findings",
)
def list_requirement_issues(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[list[RequirementIssueResponse]]:
    issues = RequirementService(session).list_issues(project_id, requirement_id, current_user.id)
    return DataResponse(data=[RequirementIssueResponse.model_validate(issue) for issue in issues])


@project_router.post(
    "/{requirement_id}/issues/{issue_id}/resolve",
    response_model=DataResponse[RequirementIssueResponse],
    summary="Resolve a requirement issue",
)
def resolve_issue(
    project_id: UUID,
    requirement_id: UUID,
    issue_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementIssueResponse]:
    issue = RequirementService(session).transition_issue(
        project_id, requirement_id, issue_id, IssueStatus.RESOLVED, current_user.id
    )
    return DataResponse(data=RequirementIssueResponse.model_validate(issue))


@project_router.post(
    "/{requirement_id}/issues/{issue_id}/dismiss",
    response_model=DataResponse[RequirementIssueResponse],
    summary="Dismiss a requirement issue",
)
def dismiss_issue(
    project_id: UUID,
    requirement_id: UUID,
    issue_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementIssueResponse]:
    issue = RequirementService(session).transition_issue(
        project_id, requirement_id, issue_id, IssueStatus.DISMISSED, current_user.id
    )
    return DataResponse(data=RequirementIssueResponse.model_validate(issue))


@project_router.get(
    "/{requirement_id}/evidence",
    response_model=DataResponse[RequirementEvidenceResponse],
    summary="Trace requirement source evidence",
)
def get_requirement_evidence(
    project_id: UUID,
    requirement_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[RequirementEvidenceResponse]:
    requirement = RequirementService(session).get(
        requirement_id,
        with_traceability=True,
        project_id=project_id,
        user_id=current_user.id,
    )
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
