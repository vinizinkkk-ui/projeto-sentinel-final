"""/api/calls — fila de espera, chamada de pacientes (TV) e histórico de atendimentos."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.db import db
from lib.dates import aware
from models.hospital import Call, CallAssignRequest
from routers.auth import current_user

router = APIRouter(prefix="/calls", tags=["calls"])


def normalize(doc: dict) -> Call:
    for field in ("created_at", "called_at", "finished_at"):
        doc[field] = aware(doc.get(field))
    return Call(**doc)


async def _room_or_404(room_id: str) -> dict:
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Consultório não encontrado")
    if room.get("status") == "manutencao":
        raise HTTPException(status_code=409, detail="Consultório em manutenção")
    if room.get("status") == "em_atendimento":
        raise HTTPException(status_code=409, detail="Consultório ocupado")
    return room


async def _professional_or_404(professional_id: str | None) -> dict | None:
    if not professional_id:
        return None
    professional = await db.users.find_one({"id": professional_id, "active": True})
    if not professional:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")
    return professional


async def _mark_called(call_doc: dict, room_doc: dict, professional: dict | None) -> Call:
    now = datetime.now(timezone.utc)
    prof_id = professional["id"] if professional else None
    prof_name = professional["name"] if professional else None

    await db.calls.update_one(
        {"id": call_doc["id"]},
        {"$set": {
            "status": "chamado",
            "called_at": now,
            "room_id": room_doc["id"],
            "room_label": room_doc["label"],
            "professional_id": prof_id,
            "professional_name": prof_name,
        }},
    )
    await db.rooms.update_one(
        {"id": room_doc["id"]},
        {"$set": {
            "status": "em_atendimento",
            "current_ticket": call_doc["ticket"],
            "current_patient": call_doc["patient_name"],
            "professional_name": prof_name,
        }},
    )
    updated = await db.calls.find_one({"id": call_doc["id"]})
    return normalize(updated)


# --- rotas públicas (a TV de chamadas não faz login) ---

@router.get("/current", response_model=Call | None)
async def current_call():
    doc = await db.calls.find_one({"status": "chamado"}, sort=[("called_at", DESCENDING)])
    return normalize(doc) if doc else None


@router.get("/recent", response_model=list[Call])
async def recent_calls(limit: int = 6):
    docs = await db.calls.find({"called_at": {"$ne": None}}).sort("called_at", DESCENDING).to_list(limit)
    return [normalize(d) for d in docs]


# --- ações da equipe ---

@router.post("/next", response_model=Call)
async def call_next(body: CallAssignRequest, user=Depends(current_user)):
    """Chama o próximo paciente da fila (senha mais antiga aguardando)."""
    waiting = await db.calls.find_one({"status": "aguardando"}, sort=[("created_at", ASCENDING)])
    if not waiting:
        raise HTTPException(status_code=404, detail="Nenhum paciente na fila de espera")
    room = await _room_or_404(body.room_id)
    professional = await _professional_or_404(body.professional_id)
    return await _mark_called(waiting, room, professional)


@router.post("/{call_id}/call", response_model=Call)
async def call_patient(call_id: str, body: CallAssignRequest, user=Depends(current_user)):
    """Chama uma senha específica para um consultório — aparece na TV em tempo real."""
    call_doc = await db.calls.find_one({"id": call_id})
    if not call_doc:
        raise HTTPException(status_code=404, detail="Senha não encontrada")
    if call_doc["status"] != "aguardando":
        raise HTTPException(status_code=409, detail="Esta senha não está mais aguardando atendimento")
    room = await _room_or_404(body.room_id)
    professional = await _professional_or_404(body.professional_id)
    return await _mark_called(call_doc, room, professional)


@router.post("/{call_id}/repeat", response_model=Call)
async def repeat_call(call_id: str, user=Depends(current_user)):
    """Repete o anúncio da chamada ativa na TV."""
    call_doc = await db.calls.find_one({"id": call_id})
    if not call_doc:
        raise HTTPException(status_code=404, detail="Senha não encontrada")
    if call_doc["status"] != "chamado":
        raise HTTPException(status_code=409, detail="Só é possível repetir a chamada ativa")
    await db.calls.update_one({"id": call_id}, {"$inc": {"repeat_count": 1}})
    return normalize(await db.calls.find_one({"id": call_id}))


@router.post("/{call_id}/finish", response_model=Call)
async def finish_call(call_id: str, user=Depends(current_user)):
    """Finaliza o atendimento e libera o consultório."""
    call_doc = await db.calls.find_one({"id": call_id})
    if not call_doc:
        raise HTTPException(status_code=404, detail="Senha não encontrada")
    if call_doc["status"] != "chamado":
        raise HTTPException(status_code=409, detail="Só é possível finalizar um atendimento em andamento")

    now = datetime.now(timezone.utc)
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"status": "finalizado", "finished_at": now}},
    )
    await db.rooms.update_one(
        {"id": call_doc.get("room_id")},
        {"$set": {"status": "disponivel", "current_ticket": None, "current_patient": None, "professional_name": None}},
    )
    await db.patients.update_one({"id": call_doc.get("patient_id")}, {"$set": {"active_ticket": None}})
    return normalize(await db.calls.find_one({"id": call_id}))


@router.get("", response_model=list[Call])
async def list_calls(status: str = "", limit: int = 200, user=Depends(current_user)):
    query: dict = {}
    if status:
        query["status"] = status
    sort_field, direction = ("created_at", ASCENDING) if status == "aguardando" else ("called_at", DESCENDING)
    docs = await db.calls.find(query).sort(sort_field, direction).to_list(limit)
    return [normalize(d) for d in docs]
