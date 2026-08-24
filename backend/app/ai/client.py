from __future__ import annotations

import asyncio
import json
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
    def __init__(self, settings: Settings) -> None:
        if not settings.llm_api_key or not settings.llm_model:
            raise ValueError("LLM_API_KEY and LLM_MODEL are required for an external provider")
        self.model_name = settings.llm_model
        self.max_retries = settings.llm_max_retries
        self._client = httpx.AsyncClient(
            base_url=settings.llm_base_url.rstrip("/"),
            timeout=settings.llm_timeout_seconds,
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
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
                        {"context": context, "output_schema": schema.model_json_schema()},
                        default=str,
                        ensure_ascii=False,
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        for attempt in range(self.max_retries + 1):
            try:
                response = await self._client.post("/chat/completions", json=payload)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return schema.model_validate_json(content)
            except httpx.TimeoutException as exc:
                if attempt == self.max_retries:
                    raise AITimeoutError("The AI provider timed out") from exc
            except (httpx.HTTPError, KeyError, TypeError) as exc:
                if attempt == self.max_retries:
                    raise AIProviderError("The AI provider returned an invalid response") from exc
            except (ValidationError, ValueError) as exc:
                raise AIOutputValidationError(
                    "AI output did not match the expected schema"
                ) from exc
            await asyncio.sleep(0.25 * (2**attempt))
        raise AIProviderError("The AI provider request failed")

    async def close(self) -> None:
        await self._client.aclose()


def create_ai_client(settings: Settings) -> AIClient:
    if settings.llm_provider.lower() == "stub":
        return StubAIClient()
    if settings.llm_provider.lower() in {"openai", "openai_compatible"}:
        return OpenAICompatibleClient(settings)
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
