from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models.enums import ProjectRole, ProjectStatus


def _strip_non_blank(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        raise ValueError("value must not be blank")
    return stripped


def _normalize_string_list(values: list[str] | None) -> list[str] | None:
    if values is None:
        return None
    normalized = list(dict.fromkeys(value.strip() for value in values if value.strip()))
    if any(len(value) > 255 for value in normalized):
        raise ValueError("list items must not exceed 255 characters")
    return normalized


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    product_name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    goal: str | None = None
    target_users: list[str] = Field(default_factory=list, max_length=100)
    platform: str | None = Field(default=None, max_length=100)
    main_features: list[str] = Field(default_factory=list, max_length=100)
    additional_context: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _strip_non_blank(value) or value

    @field_validator("target_users", "main_features")
    @classmethod
    def normalize_lists(cls, value: list[str]) -> list[str]:
        return _normalize_string_list(value) or []


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    product_name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    goal: str | None = None
    target_users: list[str] | None = Field(default=None, max_length=100)
    platform: str | None = Field(default=None, max_length=100)
    main_features: list[str] | None = Field(default=None, max_length=100)
    additional_context: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        return _strip_non_blank(value)

    @field_validator("target_users", "main_features")
    @classmethod
    def normalize_lists(cls, value: list[str] | None) -> list[str] | None:
        return _normalize_string_list(value)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    product_name: str | None
    description: str | None
    goal: str | None
    target_users: list[str]
    platform: str | None
    main_features: list[str]
    additional_context: str | None
    status: ProjectStatus
    archived_at: datetime | None
    current_user_role: ProjectRole | None = None
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    role: ProjectRole

    @field_validator("role")
    @classmethod
    def disallow_owner(cls, value: ProjectRole) -> ProjectRole:
        if value is ProjectRole.OWNER:
            raise ValueError("Use ownership transfer to assign OWNER")
        return value


class ProjectMemberUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: ProjectRole

    @field_validator("role")
    @classmethod
    def disallow_owner(cls, value: ProjectRole) -> ProjectRole:
        if value is ProjectRole.OWNER:
            raise ValueError("Use ownership transfer to assign OWNER")
        return value


class OwnershipTransfer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID


class ProjectMemberResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: ProjectRole
    joined_at: datetime
