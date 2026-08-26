from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.exceptions import AuthenticationError, RateLimitExceeded
from app.core.rate_limit import FixedWindowRateLimiter, client_ip
from app.modules.analysis.schemas import (
    FeedbackAnalysisMode,
    FeedbackAnalysisRequest,
    RequirementGenerationRequest,
)
from app.modules.auth.security import decode_access_token
from app.modules.feedback.schemas import FeedbackCreate, FeedbackUpdate
from app.modules.needs.schemas import TrendClassification
from app.modules.needs.service import UserNeedService
from app.modules.projects.schemas import ProjectCreate, ProjectMemberCreate, ProjectUpdate
from app.modules.public_feedback.schemas import PublicFeedbackSubmission
from app.modules.requirements.schemas import RequirementApprovalRequest, RequirementUpdate


def test_production_requires_strong_jwt_secret_and_allowlisted_algorithm():
    with pytest.raises(ValueError, match="at least 32 bytes"):
        Settings(database_url="sqlite://", app_env="production", jwt_secret_key="short")
    settings = Settings(
        database_url="sqlite://",
        app_env="production",
        jwt_secret_key="x" * 32,
        jwt_algorithm="HS512",
    )
    assert settings.jwt_algorithm == "HS512"
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite://", jwt_algorithm="none")


def test_fixed_window_rate_limiter_limits_prunes_and_uses_client_ip(monkeypatch):
    clock = iter([0.0, 0.1, 0.2, 0.3, 61.0, 61.1])
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: next(clock))
    limiter = FixedWindowRateLimiter(max_keys=1)
    limiter.check("a", limit=1, window_seconds=60)
    with pytest.raises(RateLimitExceeded) as error:
        limiter.check("a", limit=1, window_seconds=60)
    assert error.value.details["retry_after"] >= 1
    limiter.check("b", limit=1, window_seconds=60)
    limiter.check("a", limit=1, window_seconds=60)
    limiter.check("c", limit=1, window_seconds=60)

    forwarded = SimpleNamespace(headers={"X-Forwarded-For": "203.0.113.10, 10.0.0.1"}, client=None)
    direct = SimpleNamespace(headers={}, client=SimpleNamespace(host="127.0.0.1"))
    unknown = SimpleNamespace(headers={}, client=None)
    assert client_ip(forwarded) == "203.0.113.10"
    assert client_ip(direct) == "127.0.0.1"
    assert client_ip(unknown) == "unknown"


def test_command_schemas_reject_duplicates_blanks_and_forbidden_roles():
    identifier = uuid4()
    with pytest.raises(ValidationError, match="feedback_ids must be unique"):
        FeedbackAnalysisRequest(
            mode=FeedbackAnalysisMode.SELECTED,
            feedback_ids=[identifier, identifier],
        )
    with pytest.raises(ValidationError, match="need_ids must be unique"):
        RequirementGenerationRequest(need_ids=[identifier, identifier])
    with pytest.raises(ValidationError):
        FeedbackCreate(content="   ")
    with pytest.raises(ValidationError):
        FeedbackUpdate(content="   ")
    with pytest.raises(ValidationError):
        RequirementUpdate(title="   ")
    with pytest.raises(ValidationError):
        ProjectMemberCreate(email="owner@example.com", role="OWNER")
    with pytest.raises(ValidationError):
        PublicFeedbackSubmission(content=" ")
    assert RequirementApprovalRequest().acknowledge_outdated_validation is False


def test_project_lists_are_normalized_and_invalid_long_items_are_rejected():
    project = ProjectCreate(
        name=" Project ",
        target_users=[" Student ", "Student", ""],
        main_features=[" Search ", "Search"],
    )
    assert project.name == "Project"
    assert project.target_users == ["Student"]
    assert project.main_features == ["Search"]
    assert ProjectUpdate(target_users=None).target_users is None
    with pytest.raises(ValidationError, match="must not exceed"):
        ProjectCreate(name="Project", target_users=["x" * 256])


def test_trend_classification_covers_all_deterministic_states():
    classify = UserNeedService._classification
    assert classify(0, 1) is TrendClassification.NEW
    assert classify(5, 7) is TrendClassification.RISING
    assert classify(10, 8) is TrendClassification.FALLING
    assert classify(5, 6) is TrendClassification.STABLE


def test_decode_token_rejects_missing_or_invalid_subject():
    settings = Settings(database_url="sqlite://", jwt_secret_key="x" * 32)
    token_without_subject = jwt.encode({}, settings.jwt_secret_key, algorithm="HS256")
    with pytest.raises(AuthenticationError):
        decode_access_token(token_without_subject, settings)
    invalid_uuid_token = jwt.encode(
        {"sub": "not-a-uuid"}, settings.jwt_secret_key, algorithm="HS256"
    )
    with pytest.raises(AuthenticationError):
        decode_access_token(invalid_uuid_token, settings)
    with pytest.raises(AuthenticationError):
        decode_access_token("not-a-token", settings)
