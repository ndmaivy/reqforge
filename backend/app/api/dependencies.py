from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.db.models import User
from app.db.session import get_session
from app.modules.auth.security import decode_access_token
from app.modules.auth.service import AuthService

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if credentials is None:
        raise AuthenticationError("Authentication required")
    user_id = decode_access_token(credentials.credentials, request.app.state.settings)
    return AuthService(session, request.app.state.settings).get_user(user_id)


__all__ = ["get_current_user", "get_session"]
