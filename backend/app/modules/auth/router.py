from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_session
from app.api.schemas import DataResponse
from app.db.models import User
from app.modules.auth.schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[AuthResponse],
    summary="Register a user",
)
def register(
    payload: RegisterRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> DataResponse[AuthResponse]:
    data = AuthService(session, request.app.state.settings).register(payload)
    return DataResponse(data=data)


@router.post(
    "/login",
    response_model=DataResponse[AuthResponse],
    summary="Log in with email and password",
)
def login(
    payload: LoginRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> DataResponse[AuthResponse]:
    data = AuthService(session, request.app.state.settings).login(payload)
    return DataResponse(data=data)


@router.get(
    "/me",
    response_model=DataResponse[UserResponse],
    summary="Get the authenticated user",
)
def me(current_user: User = Depends(get_current_user)) -> DataResponse[UserResponse]:
    return DataResponse(data=UserResponse.model_validate(current_user))
