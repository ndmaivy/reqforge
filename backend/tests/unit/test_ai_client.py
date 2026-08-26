from __future__ import annotations

import asyncio
import json
import logging
from uuid import uuid4

import httpx
import pytest

from app.ai.client import OpenAICompatibleClient, StubAIClient, create_ai_client
from app.core.config import Settings
from app.core.exceptions import AIOutputValidationError, AIProviderError


def real_settings(**overrides) -> Settings:
    values = {
        "database_url": "sqlite+pysqlite:///:memory:",
        "llm_provider": "openai",
        "llm_api_key": "test-api-key",
        "llm_model": "test-model",
        "llm_base_url": "https://provider.test/v1",
        "llm_max_retries": 0,
    }
    values.update(overrides)
    return Settings(**values)


def valid_feedback_output(feedback_id) -> dict:
    return {
        "feedback_results": [
            {
                "feedback_id": str(feedback_id),
                "category": "USABILITY",
                "is_noise": False,
                "similar_feedback_ids": [],
            }
        ],
        "candidate_needs": [],
    }


def valid_provider_response(feedback_id) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"content": json.dumps(valid_feedback_output(feedback_id))}}]
        },
    )


def test_provider_selection_preserves_explicit_stub():
    client = create_ai_client(
        Settings(database_url="sqlite+pysqlite:///:memory:", llm_provider="stub")
    )

    assert isinstance(client, StubAIClient)
    assert client.model_name == "stub-v1"


def test_provider_selection_initializes_real_client_and_reports_model():
    client = create_ai_client(real_settings(llm_model="configured-production-model"))

    try:
        assert isinstance(client, OpenAICompatibleClient)
        assert client.model_name == "configured-production-model"
    finally:
        asyncio.run(client.close())


def test_reqforge_router_provider_uses_openai_compatible_client():
    client = create_ai_client(real_settings(llm_provider="reqforge-v1"))

    try:
        assert isinstance(client, OpenAICompatibleClient)
    finally:
        asyncio.run(client.close())


def test_real_provider_requires_api_key_and_model():
    with pytest.raises(ValueError, match="LLM_API_KEY and LLM_MODEL"):
        create_ai_client(real_settings(llm_api_key=None))

    with pytest.raises(ValueError, match="LLM_API_KEY and LLM_MODEL"):
        create_ai_client(real_settings(llm_model=None))


def test_structured_response_is_parsed_and_validated():
    feedback_id = uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-api-key"
        payload = json.loads(request.content)
        assert payload["stream"] is False
        user_data = json.loads(payload["messages"][1]["content"])
        assert user_data["untrusted_context"]["feedback"][0]["id"] == str(feedback_id)
        assert "required_output_schema" in user_data
        content = {
            "feedback_results": [
                {
                    "feedback_id": str(feedback_id),
                    "category": "USABILITY",
                    "is_noise": False,
                    "similar_feedback_ids": [],
                }
            ],
            "candidate_needs": [
                {
                    "title": "Read content on mobile",
                    "description": "Users need readable content on mobile devices.",
                    "source_feedback_ids": [str(feedback_id)],
                    "matched_existing_need_id": None,
                    "confidence": 0.9,
                }
            ],
        }
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(content)}}]},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    context = {"feedback": [{"id": str(feedback_id), "content": "Hard to read"}]}
    try:
        output = asyncio.run(client.analyze_feedback(context))
    finally:
        asyncio.run(client.close())

    assert output.feedback_results[0].feedback_id == feedback_id
    assert output.candidate_needs[0].confidence == 0.9


def test_http_200_valid_json_response_is_parsed():
    feedback_id = uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        return valid_provider_response(feedback_id)

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    try:
        output = asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    assert output.feedback_results[0].feedback_id == feedback_id


def test_http_200_empty_body_logs_safe_metadata_and_fails(caplog):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            content=b"",
            headers={"content-type": "application/json", "content-length": "0"},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    try:
        with caplog.at_level(logging.WARNING, logger="app.ai.client"):
            with pytest.raises(AIProviderError, match="invalid JSON response"):
                asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    record = caplog.records[-1]
    assert record.http_status == 200
    assert record.content_type == "application/json"
    assert record.content_length_header == "0"
    assert record.response_content_length == 0
    assert record.response_body_is_blank is True
    assert record.provider_attempt == 1
    assert record.provider_max_attempts == 1


def test_http_200_invalid_json_body_logs_safe_metadata_and_fails(caplog):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            content=b"<html>down</html>",
            headers={"content-type": "text/html", "content-length": "17"},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    try:
        with caplog.at_level(logging.WARNING, logger="app.ai.client"):
            with pytest.raises(AIProviderError, match="invalid JSON response"):
                asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    record = caplog.records[-1]
    assert record.http_status == 200
    assert record.content_type == "text/html"
    assert record.content_length_header == "17"
    assert record.response_content_length == 17
    assert record.response_body_is_blank is False
    assert record.provider_attempt == 1
    assert record.provider_max_attempts == 1


def test_invalid_json_response_retries_then_succeeds(caplog):
    feedback_id = uuid4()
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        if request_count == 1:
            return httpx.Response(
                200,
                content=b"",
                headers={"content-type": "application/json"},
            )
        return valid_provider_response(feedback_id)

    client = OpenAICompatibleClient(real_settings(llm_max_retries=1), httpx.MockTransport(handler))
    try:
        with caplog.at_level(logging.WARNING, logger="app.ai.client"):
            output = asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    assert request_count == 2
    assert output.feedback_results[0].feedback_id == feedback_id
    assert caplog.records[-1].provider_attempt == 1
    assert caplog.records[-1].provider_max_attempts == 2


def test_invalid_json_response_exhausts_retries(caplog):
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(
            200,
            content=b"not json",
            headers={"content-type": "text/plain", "content-length": "8"},
        )

    client = OpenAICompatibleClient(real_settings(llm_max_retries=1), httpx.MockTransport(handler))
    try:
        with caplog.at_level(logging.WARNING, logger="app.ai.client"):
            with pytest.raises(AIProviderError, match="invalid JSON response"):
                asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    assert request_count == 2
    assert caplog.records[-1].provider_attempt == 2
    assert caplog.records[-1].provider_max_attempts == 2


def test_invalid_structured_response_retries_once_then_fails():
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps({"feedback_results": []})}}]},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    try:
        with pytest.raises(AIOutputValidationError, match="expected schema"):
            asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    assert request_count == 2


def test_markdown_json_fence_is_stripped_before_validation():
    feedback_id = uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        content = {
            "feedback_results": [
                {
                    "feedback_id": str(feedback_id),
                    "category": "USABILITY",
                    "is_noise": False,
                    "similar_feedback_ids": [],
                }
            ],
            "candidate_needs": [],
        }
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": f"```json\n{json.dumps(content)}\n```"}}]},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))
    try:
        output = asyncio.run(client.analyze_feedback({"feedback": []}))
    finally:
        asyncio.run(client.close())

    assert output.feedback_results[0].feedback_id == feedback_id


def test_generation_and_validation_paths_use_their_structured_schemas():
    need_id = uuid4()
    responses = iter(
        [
            {
                "requirements": [
                    {
                        "title": "Preserve entered form data",
                        "description": "The system shall preserve entered data after a timeout.",
                        "type": "FUNCTIONAL",
                        "source_need_ids": [str(need_id)],
                        "confidence": 0.8,
                    }
                ]
            },
            {
                "intent_preservation": "GOOD",
                "evidence_strength": "MEDIUM",
                "review_priority": "HIGH",
                "issues": [
                    {
                        "type": "UNSUPPORTED_ASSUMPTION",
                        "severity": "HIGH",
                        "problematic_text": "after a timeout",
                        "reason": "The timeout behavior needs supporting evidence.",
                        "suggestion": "Confirm the expected timeout behavior with users.",
                        "confidence": 0.85,
                    }
                ],
            },
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        content = next(responses)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(content)}}]},
        )

    client = OpenAICompatibleClient(real_settings(), httpx.MockTransport(handler))

    async def execute():
        try:
            generation = await client.generate_requirements({"needs": [{"id": str(need_id)}]})
            validation = await client.validate_requirement(
                {"requirement": {"description": "Preserve data after a timeout."}}
            )
            return generation, validation
        finally:
            await client.close()

    generation, validation = asyncio.run(execute())

    assert generation.requirements[0].source_need_ids == [need_id]
    assert generation.requirements[0].type.value == "FUNCTIONAL"
    assert validation.issues[0].type.value == "UNSUPPORTED_ASSUMPTION"
    assert validation.issues[0].problematic_text == "after a timeout"
