"""/api/users — profissionais e usuários do sistema (gestão restrita ao admin)."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.security import hash_password
from models.hospital import ROLES, User, UserCreate
from routers.auth import current_user, require

router = APIRouter(prefix="/users", tags=["users"])


def normalize(doc: dict) -> User:
    return User(**doc)


@router.get("", response_model=list[User])
async def list_users(user=Depends(current_user)):
    docs = await db.users.find({"active": True}).sort("name", ASCENDING).to_list(200)
    return [normalize(d) for d in docs]


@router.post("", response_model=User, status_code=201)
async def create_user(body: UserCreate, user=Depends(require(["admin"]))):
    username = body.username.strip().lower()
    if not username or len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Informe usuário e senha (mínimo 4 caracteres)")
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Perfil de acesso inválido")
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=409, detail="Já existe um usuário com este login")

    account = User(
        name=body.name.strip(),
        username=username,
        role=body.role,
        specialty=body.specialty,
    )
    payload = account.model_dump()
    payload["password_hash"] = hash_password(body.password)
    await db.users.insert_one(payload)
    return account


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, user: User = Depends(require(["admin"]))):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Você não pode remover o próprio usuário")
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.users.delete_one({"id": user_id})
