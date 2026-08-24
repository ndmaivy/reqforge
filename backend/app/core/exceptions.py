from __future__ import annotations

from typing import Any


class DomainError(Exception):
    code = "DOMAIN_ERROR"
    status_code = 400

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(DomainError):
    status_code = 404


class ProjectNotFound(NotFoundError):
    code = "PROJECT_NOT_FOUND"


class FeedbackNotFound(NotFoundError):
    code = "FEEDBACK_NOT_FOUND"


class NeedNotFound(NotFoundError):
    code = "NEED_NOT_FOUND"


class RequirementNotFound(NotFoundError):
    code = "REQUIREMENT_NOT_FOUND"


class AnalysisRunNotFound(NotFoundError):
    code = "ANALYSIS_RUN_NOT_FOUND"


class RequirementIssueNotFound(NotFoundError):
    code = "REQUIREMENT_ISSUE_NOT_FOUND"


class CrossProjectReferenceError(DomainError):
    code = "CROSS_PROJECT_REFERENCE"
    status_code = 409


class InvalidStateTransition(DomainError):
    code = "INVALID_STATE_TRANSITION"
    status_code = 409


class DuplicateResource(DomainError):
    code = "DUPLICATE_RESOURCE"
    status_code = 409


class EmptyAnalysisInput(DomainError):
    code = "EMPTY_ANALYSIS_INPUT"
    status_code = 422


class ImportFileError(DomainError):
    code = "IMPORT_FILE_ERROR"
    status_code = 422


class AIProviderError(DomainError):
    code = "AI_PROVIDER_ERROR"
    status_code = 502


class AITimeoutError(AIProviderError):
    code = "AI_TIMEOUT_ERROR"


class AIOutputValidationError(DomainError):
    code = "AI_OUTPUT_VALIDATION_ERROR"
    status_code = 502
