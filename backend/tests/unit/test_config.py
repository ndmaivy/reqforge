import pytest

from app.core.config import Settings


def test_database_url_normalizes_render_postgresql_scheme():
    settings = Settings(database_url="postgresql://user:password@db.example.com/reqforge")

    assert settings.database_url == (
        "postgresql+psycopg://user:password@db.example.com/reqforge"
    )


def test_database_url_keeps_explicit_sqlalchemy_driver():
    database_url = "postgresql+psycopg://user:password@db.example.com/reqforge"

    assert Settings(database_url=database_url).database_url == database_url


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


def test_cors_origins_reject_wildcard_with_credentials():
    with pytest.raises(ValueError, match="cannot contain"):
        Settings(database_url="sqlite+pysqlite:///:memory:", cors_origins=["*"])
