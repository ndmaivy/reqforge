from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from app.core.config import Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def raw_client(tmp_path):
    database_path = tmp_path / "reqforge-test.db"
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{database_path}",
        llm_provider="stub",
        jwt_secret_key="test-signing-secret-for-reqforge-auth",
        cors_origins=[],
        log_level="WARNING",
    )
    app = create_app(settings)
    with TestClient(app) as test_client:
        Base.metadata.create_all(app.state.engine)
        yield test_client


@pytest.fixture
def client(raw_client: TestClient) -> TestClient:
    response = raw_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "email": "test@example.com",
            "password": "test-password-123",
        },
    )
    assert response.status_code == 201
    raw_client.headers.update(
        {"Authorization": f"Bearer {response.json()['data']['access_token']}"}
    )
    return raw_client
