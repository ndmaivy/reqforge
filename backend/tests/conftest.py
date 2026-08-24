from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from app.core.config import Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    database_path = tmp_path / "reqforge-test.db"
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{database_path}",
        llm_provider="stub",
        cors_origins=[],
        log_level="WARNING",
    )
    app = create_app(settings)
    with TestClient(app) as test_client:
        Base.metadata.create_all(app.state.engine)
        yield test_client
