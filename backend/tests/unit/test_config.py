from app.core.config import Settings


def test_cors_origins_accept_comma_separated_environment_value(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173"
    )
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")

    settings = Settings()

    assert settings.cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
