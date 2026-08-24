from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class DataResponse(BaseModel, Generic[T]):
    data: T


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class ListResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta


class HealthResponse(BaseModel):
    status: str
