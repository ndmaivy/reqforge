from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PublicFormCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    expires_at: datetime | None = None


class PublicFormUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    expires_at: datetime | None = None


class PublicFormResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    description: str | None
    is_active: bool
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PublicFormTokenResponse(PublicFormResponse):
    token: str
    public_url: str


class PublicFormContext(BaseModel):
    project_name: str
    product_name: str | None
    title: str
    description: str | None
    allowed_metadata_options: list[str]


class PublicFeedbackSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=10_000)
    user_segment: str | None = Field(default=None, max_length=255)
    context: str | None = Field(default=None, max_length=5_000)
    feedback_date: datetime | None = None
    submission_key: str | None = Field(default=None, min_length=1, max_length=128)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank")
        return value


class PublicSubmissionResponse(BaseModel):
    receipt_id: UUID
    created_at: datetime
    accepted: bool = True
