from __future__ import annotations

from fastapi.testclient import TestClient

REGISTER_PAYLOAD = {
    "full_name": "Mai Vy",
    "email": "mai.vy@example.com",
    "password": "correct-horse-battery-staple",
}


def register(client: TestClient, **overrides: str) -> dict[str, object]:
    response = client.post("/api/v1/auth/register", json={**REGISTER_PAYLOAD, **overrides})
    assert response.status_code == 201
    return response.json()["data"]


def test_register_returns_user_and_signed_access_token(raw_client: TestClient):
    data = register(raw_client)

    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert data["user"]["full_name"] == REGISTER_PAYLOAD["full_name"]
    assert data["user"]["email"] == REGISTER_PAYLOAD["email"]
    assert "password_hash" not in data["user"]


def test_register_rejects_duplicate_email(raw_client: TestClient):
    register(raw_client)

    response = raw_client.post(
        "/api/v1/auth/register",
        json={**REGISTER_PAYLOAD, "email": "MAI.VY@example.com"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_RESOURCE"


def test_login_accepts_valid_credentials_and_rejects_invalid_password(raw_client: TestClient):
    register(raw_client)

    login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    invalid_login = raw_client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": "wrong-password"},
    )

    assert login.status_code == 200
    assert login.json()["data"]["user"]["email"] == REGISTER_PAYLOAD["email"]
    assert invalid_login.status_code == 401
    assert invalid_login.json()["error"]["code"] == "AUTHENTICATION_FAILED"


def test_me_requires_and_returns_the_authenticated_user(raw_client: TestClient):
    assert raw_client.get("/api/v1/auth/me").status_code == 401

    data = register(raw_client)
    response = raw_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["id"] == data["user"]["id"]
