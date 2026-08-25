from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, VerifyMismatchError

from app.core.config import Settings
from app.core.exceptions import AuthenticationError

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (Argon2Error, VerifyMismatchError):
        return False


def create_access_token(user_id: UUID, settings: Settings) -> str:
    if not settings.jwt_secret_key:
        raise AuthenticationError("JWT secret key is not configured")
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str, settings: Settings) -> UUID:
    if not settings.jwt_secret_key:
        raise AuthenticationError("JWT secret key is not configured")
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise AuthenticationError("Invalid authentication token")
        return UUID(subject)
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise AuthenticationError("Invalid authentication token") from exc
