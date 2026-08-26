from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AuthenticationError, DuplicateResource
from app.db.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.modules.auth.security import create_access_token, hash_password, verify_password


class AuthService:
    def __init__(self, session: Session, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.repository = UserRepository(session)

    def register(self, payload: RegisterRequest) -> AuthResponse:
        existing = self.repository.get_by_email(payload.email)
        if existing is not None:
            raise DuplicateResource("Email is already registered")
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
        )
        self.repository.create(user)
        try:
            self.session.flush()
            response = self._auth_response(user)
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise DuplicateResource("Email is already registered") from exc
        self.session.refresh(user)
        return response

    def login(self, payload: LoginRequest) -> AuthResponse:
        user = self.repository.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        return self._auth_response(user)

    def get_user(self, user_id: UUID) -> User:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise AuthenticationError("Invalid authentication token")
        return user

    def _auth_response(self, user: User) -> AuthResponse:
        return AuthResponse(
            access_token=create_access_token(user.id, self.settings),
            user=UserResponse.model_validate(user),
        )
