"""/api/auth — login, sessão por cookie httpOnly e dados do usuário logado."""

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.db import db
from lib.security import verify_password
from models.hospital import LoginRequest, User, utcnow

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "hmv_session"
SESSION_TTL = timedelta(days=7)


async def current_user(request: Request) -> User:
    """Dependency: resolves the session cookie to the logged-in user, or 401."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        session = await db.sessions.find_one({"token": token})
        if session:
            doc = await db.users.find_one({"id": session.get("user_id"), "active": True})
            if doc:
                return User(**doc)
    raise HTTPException(status_code=401, detail="Não autenticado")


def require(roles: list[str] | None = None):
    """Dependency factory: requires login and, when roles are listed, one of them."""

    async def dependency(user: User = Depends(current_user)) -> User:
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail="Acesso negado para o seu perfil")
        return user

    return dependency


@router.post("/login", response_model=User)
async def login(body: LoginRequest, response: Response) -> User:
    username = body.username.strip().lower()
    doc = await db.users.find_one({"username": username})
    if not doc or not verify_password(body.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    if not doc.get("active", True):
        raise HTTPException(status_code=401, detail="Usuário desativado — procure a administração")

    token = str(uuid.uuid4())
    now = utcnow()
    await db.sessions.insert_one({
        "token": token,
        "user_id": doc["id"],
        "created_at": now,
        "expires_at": now + SESSION_TTL,
    })
    response.set_cookie(
        COOKIE_NAME, token,
        httponly=True, samesite="lax", path="/",
        max_age=int(SESSION_TTL.total_seconds()),
    )
    return User(**doc)


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=User)
async def me(user: User = Depends(current_user)) -> User:
    return user
