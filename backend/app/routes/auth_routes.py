"""
Authentication routes with in-memory user storage.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.schemas import (
    UserCreate,
    UserLogin,
    UserOut,
    TokenPair,
    TokenRefresh,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_users_db: dict[str, dict] = {}  # email -> {id, email, password_hash, display_name, ...}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    if body.email in _users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    _users_db[body.email] = {
        "id": user_id,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "display_name": body.display_name,
        "avatar_url": None,
        "is_active": True,
        "created_at": now,
    }

    return UserOut(
        id=user_id,
        email=body.email,
        display_name=body.display_name,
        avatar_url=None,
        is_active=True,
        created_at=now,
    )


@router.post("/login", response_model=TokenPair)
async def login(body: UserLogin):
    user = _users_db.get(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token_data = {"sub": user["id"], "email": user["email"]}
    return TokenPair(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: TokenRefresh):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token",
        )

    token_data = {"sub": payload["sub"], "email": payload.get("email", "")}
    return TokenPair(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    user = None
    for stored in _users_db.values():
        if stored["id"] == current_user["id"]:
            user = stored
            break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserOut(
        id=user["id"],
        email=user["email"],
        display_name=user["display_name"],
        avatar_url=user["avatar_url"],
        is_active=user["is_active"],
        created_at=user["created_at"],
    )
