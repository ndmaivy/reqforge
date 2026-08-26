from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse
from app.core.rate_limit import client_ip
from app.db.models import User
from app.modules.public_feedback.schemas import (
    PublicFeedbackSubmission,
    PublicFormContext,
    PublicFormCreate,
    PublicFormResponse,
    PublicFormTokenResponse,
    PublicFormUpdate,
    PublicSubmissionResponse,
)
from app.modules.public_feedback.service import PublicFeedbackService

project_router = APIRouter(
    prefix="/projects/{project_id}/public-feedback-form", tags=["Public Feedback"]
)
public_router = APIRouter(prefix="/public/feedback", tags=["Public Feedback"])


def _token_response(form, token: str, base_url: str) -> PublicFormTokenResponse:
    return PublicFormTokenResponse.model_validate(
        {
            **form.__dict__,
            "token": token,
            "public_url": f"{base_url.rstrip('/')}/{token}",
        }
    )


@project_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[PublicFormTokenResponse],
)
def create_form(
    project_id: UUID,
    payload: PublicFormCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[PublicFormTokenResponse]:
    form, token = PublicFeedbackService(session).create(project_id, payload, current_user.id)
    return DataResponse(
        data=_token_response(form, token, request.app.state.settings.public_feedback_base_url)
    )


@project_router.get("", response_model=DataResponse[PublicFormResponse])
def get_form(
    project_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[PublicFormResponse]:
    form = PublicFeedbackService(session).get_admin(project_id, current_user.id)
    return DataResponse(data=PublicFormResponse.model_validate(form))


@project_router.patch("", response_model=DataResponse[PublicFormResponse])
def update_form(
    project_id: UUID,
    payload: PublicFormUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[PublicFormResponse]:
    form = PublicFeedbackService(session).update(project_id, payload, current_user.id)
    return DataResponse(data=PublicFormResponse.model_validate(form))


@project_router.post("/rotate", response_model=DataResponse[PublicFormTokenResponse])
def rotate_form(
    project_id: UUID,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DataResponse[PublicFormTokenResponse]:
    form, token = PublicFeedbackService(session).rotate(project_id, current_user.id)
    return DataResponse(
        data=_token_response(form, token, request.app.state.settings.public_feedback_base_url)
    )


@public_router.get("/{token}", response_model=DataResponse[PublicFormContext])
def public_form_context(
    token: str, session: Session = Depends(get_session)
) -> DataResponse[PublicFormContext]:
    form = PublicFeedbackService(session).resolve_token(token)
    return DataResponse(
        data=PublicFormContext(
            project_name=form.project.name,
            product_name=form.project.product_name,
            title=form.title,
            description=form.description,
            allowed_metadata_options=["user_segment", "context", "feedback_date"],
        )
    )


@public_router.post(
    "/{token}",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[PublicSubmissionResponse],
)
def submit_public_feedback(
    token: str,
    payload: PublicFeedbackSubmission,
    request: Request,
    session: Session = Depends(get_session),
) -> DataResponse[PublicSubmissionResponse]:
    service = PublicFeedbackService(session)
    form = service.resolve_token(token)
    request.app.state.rate_limiter.check(
        f"public-feedback:{form.id}:{client_ip(request)}",
        request.app.state.settings.rate_limit_public_submit_per_hour,
        3600,
    )
    feedback = service.submit(token, payload, payload.submission_key, form)
    return DataResponse(
        data=PublicSubmissionResponse(receipt_id=feedback.id, created_at=feedback.created_at)
    )
