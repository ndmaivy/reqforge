from __future__ import annotations

import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.ai.prompts.feedback_analysis import SYSTEM_PROMPT as FEEDBACK_PROMPT
from app.ai.prompts.requirement_generation import SYSTEM_PROMPT as GENERATION_PROMPT
from app.ai.prompts.requirement_validation import SYSTEM_PROMPT as VALIDATION_PROMPT
from app.ai.schemas import (
    FeedbackAnalysisOutput,
    RequirementGenerationOutput,
    RequirementValidationOutput,
)
from app.core.config import Settings
from app.core.exceptions import AIOutputValidationError, AIProviderError, AITimeoutError

OutputT = TypeVar("OutputT", bound=BaseModel)
logger = logging.getLogger(__name__)


class AIClient(ABC):
    model_name: str

    @abstractmethod
    async def analyze_feedback(self, context: dict[str, Any]) -> FeedbackAnalysisOutput: ...

    @abstractmethod
    async def generate_requirements(
        self, context: dict[str, Any]
    ) -> RequirementGenerationOutput: ...

    @abstractmethod
    async def validate_requirement(
        self, context: dict[str, Any]
    ) -> RequirementValidationOutput: ...

    async def close(self) -> None:
        return None


class StubAIClient(AIClient):
    """Deterministic local adapter for development and automated tests."""

    model_name = "stub-v1"

    async def analyze_feedback(self, context: dict[str, Any]) -> FeedbackAnalysisOutput:
        results: list[dict[str, Any]] = []
        needs: list[dict[str, Any]] = []
        for item in context["feedback"]:
            content = item["content"].strip()
            lowered = content.lower()
            is_noise = len(content.split()) < 3
            if any(word in lowered for word in ("bug", "error", "lỗi", "crash")):
                category = "BUG"
            elif any(word in lowered for word in ("khó", "difficult", "confusing", "usability")):
                category = "USABILITY"
            else:
                category = "FEATURE_REQUEST"
            results.append(
                {
                    "feedback_id": item["id"],
                    "category": category,
                    "is_noise": is_noise,
                    "similar_feedback_ids": [],
                }
            )
            if not is_noise:
                short = re.sub(r"\s+", " ", content).strip()
                needs.append(
                    {
                        "title": f"Address feedback: {short[:80]}",
                        "description": f"Users need an improved experience regarding: {short}",
                        "source_feedback_ids": [item["id"]],
                        "matched_existing_need_id": None,
                        "confidence": 0.7,
                    }
                )
        return FeedbackAnalysisOutput.model_validate(
            {"feedback_results": results, "candidate_needs": needs}
        )

    async def generate_requirements(
        self, context: dict[str, Any]
    ) -> RequirementGenerationOutput:
        requirements = [
            {
                "title": f"Support {need['title']}",
                "description": f"The system shall {need['description'].rstrip('.') }.",
                "type": "FUNCTIONAL",
                "source_need_ids": [need["id"]],
                "confidence": 0.7,
            }
            for need in context["needs"]
        ]
        return RequirementGenerationOutput.model_validate({"requirements": requirements})

    async def validate_requirement(
        self, context: dict[str, Any]
    ) -> RequirementValidationOutput:
        requirement = context["requirement"]
        issues: list[dict[str, Any]] = []
        if len(requirement["description"].split()) < 8:
            issues.append(
                {
                    "type": "MISSING_INFORMATION",
                    "severity": "MEDIUM",
                    "problematic_text": requirement["description"],
                    "reason": "The requirement is too short to define testable behavior.",
                    "suggestion": "Add actor, condition, behavior, and expected outcome.",
                    "confidence": 0.8,
                }
            )
        return RequirementValidationOutput.model_validate(
            {
                "intent_preservation": "GOOD" if context["needs"] else "NOT_APPLICABLE",
                "evidence_strength": "MEDIUM" if context["feedback"] else "LOW",
                "review_priority": "HIGH" if issues else "LOW",
                "issues": issues,
            }
        )


class OpenAICompatibleClient(AIClient):
    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not settings.llm_api_key or not settings.llm_model:
            raise ValueError("LLM_API_KEY and LLM_MODEL are required for an external provider")
        self.model_name = settings.llm_model
        self.max_retries = settings.llm_max_retries
        self._client = httpx.AsyncClient(
            base_url=settings.llm_base_url.rstrip("/"),
            timeout=settings.llm_timeout_seconds,
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            transport=transport,
        )

    async def analyze_feedback(self, context: dict[str, Any]) -> FeedbackAnalysisOutput:
        return await self._complete(FEEDBACK_PROMPT, context, FeedbackAnalysisOutput)

    async def generate_requirements(
        self, context: dict[str, Any]
    ) -> RequirementGenerationOutput:
        return await self._complete(GENERATION_PROMPT, context, RequirementGenerationOutput)

    async def validate_requirement(
        self, context: dict[str, Any]
    ) -> RequirementValidationOutput:
        return await self._complete(VALIDATION_PROMPT, context, RequirementValidationOutput)

    async def _complete(
        self, system_prompt: str, context: dict[str, Any], schema: type[OutputT]
    ) -> OutputT:
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "untrusted_context": context,
                            "required_output_schema": schema.model_json_schema(),
                        },
                        default=str,
                        ensure_ascii=False,
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
            "stream": False,
        }
        validation_error: ValidationError | ValueError | TypeError | None = None
        for structured_attempt in range(2):
            content = await self._request_content(payload)
            try:
                return schema.model_validate_json(_strip_json_fence(content))
            except (ValidationError, ValueError, TypeError) as exc:
                validation_error = exc
                if structured_attempt == 0:
                    continue
        raise AIOutputValidationError(
            "AI output did not match the expected schema"
        ) from validation_error

    async def _request_content(self, payload: dict[str, Any]) -> str:
        for attempt in range(self.max_retries + 1):
            try:
                response = await self._client.post("/chat/completions", json=payload)
                response.raise_for_status()
                try:
                    data = response.json()
                except json.JSONDecodeError as exc:
                    _log_invalid_json_response(response, attempt, self.max_retries)
                    if attempt == self.max_retries:
                        raise AIProviderError(
                            "The AI provider returned an invalid JSON response"
                        ) from exc
                    continue
                content = data["choices"][0]["message"]["content"]
                if not isinstance(content, str):
                    raise TypeError("AI response content must be a JSON string")
                return content
            except httpx.TimeoutException as exc:
                if attempt == self.max_retries:
                    raise AITimeoutError("The AI provider timed out") from exc
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                retryable = status_code in {408, 429} or status_code >= 500
                if not retryable or attempt == self.max_retries:
                    raise AIProviderError(
                        f"The AI provider request failed with HTTP {status_code}"
                    ) from exc
            except (httpx.HTTPError, IndexError, KeyError, TypeError, ValueError) as exc:
                if attempt == self.max_retries:
                    raise AIProviderError("The AI provider returned an invalid response") from exc
            await asyncio.sleep(0.25 * (2**attempt))
        raise AIProviderError("The AI provider request failed")

    async def close(self) -> None:
        await self._client.aclose()


def create_ai_client(settings: Settings) -> AIClient:
    if settings.llm_provider.lower() == "stub":
        return StubAIClient()
    if settings.llm_provider.lower() in {"openai", "openai_compatible", "reqforge-v1"}:
        return OpenAICompatibleClient(settings)
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


def _strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    if not cleaned.startswith("```"):
        return cleaned

    first_newline = cleaned.find("\n")
    if first_newline == -1 or not cleaned.endswith("```"):
        return cleaned
    return cleaned[first_newline + 1 : -3].strip()


def _log_invalid_json_response(
    response: httpx.Response, attempt: int, max_retries: int
) -> None:
    logger.warning(
        "AI provider returned non-JSON HTTP 2xx response",
        extra={
            "http_status": response.status_code,
            "content_type": response.headers.get("content-type"),
            "content_length_header": response.headers.get("content-length"),
            "response_content_length": len(response.content),
            "response_body_is_blank": not response.content.strip(),
            "provider_attempt": attempt + 1,
            "provider_max_attempts": max_retries + 1,
        },
    )
