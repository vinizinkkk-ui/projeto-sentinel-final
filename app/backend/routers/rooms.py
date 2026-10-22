"""/api/rooms — consultórios e seus estados (disponível, em atendimento, manutenção)."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.db import db
from models.hospital import Room, RoomCreate, RoomUpdate
from routers.auth import current_user, require

router = APIRouter(prefix="/rooms", tags=["rooms"])


def normalize(doc: dict) -> Room:
    return Room(**doc)


@router.get("", response_model=list[Room])
async def list_rooms(user=Depends(current_user)):
    docs = await db.rooms.find().sort("number", ASCENDING).to_list(100)
    return [normalize(d) for d in docs]


@router.post("", response_model=Room, status_code=201)
async def create_room(body: RoomCreate, user=Depends(require(["admin"]))):
    number = body.number
    if number is None:
        last = await db.rooms.find_one(sort=[("number", DESCENDING)])
        number = int(last["number"]) + 1 if last else 1
    if await db.rooms.find_one({"number": number}):
        raise HTTPException(status_code=409, detail=f"Já existe um consultório com o número {number}")

    room = Room(number=number, label=(body.label or f"Consultório {number:02d}").strip())
    await db.rooms.insert_one(room.model_dump())
    return room


@router.put("/{room_id}", response_model=Room)
async def update_room(room_id: str, body: RoomUpdate, user=Depends(require(["admin", "recepcao"]))):
    doc = await db.rooms.find_one({"id": room_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Consultório não encontrado")
    if body.status not in ["disponivel", "manutencao"]:
        raise HTTPException(status_code=400, detail="Status inválido — use disponivel ou manutencao")
    if body.status == "disponivel" and doc.get("status") == "em_atendimento" and doc.get("current_ticket"):
        raise HTTPException(status_code=409, detail="Finalize o atendimento antes de liberar o consultório")

    await db.rooms.update_one({"id": room_id}, {"$set": {"status": body.status}})
    doc["status"] = body.status
    return normalize(doc)
