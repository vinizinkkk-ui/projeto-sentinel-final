"""/api/patients — CRUD de pacientes + emissão de senha (ticket) no cadastro."""

import re

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.db import db
from lib.dates import aware
from lib.tickets import next_ticket
from models.hospital import Call, Patient, PatientCreate, PatientUpdate, SERVICE_PREFIXES, SERVICE_TYPES
from routers.auth import current_user, require

router = APIRouter(prefix="/patients", tags=["patients"])


def normalize(doc: dict) -> Patient:
    doc["created_at"] = aware(doc.get("created_at"))
    return Patient(**doc)


@router.get("", response_model=list[Patient])
async def list_patients(
    search: str = "",
    service_type: str = "",
    limit: int = 300,
    user=Depends(current_user),
):
    query: dict = {}
    if search.strip():
        rx = {"$regex": re.escape(search.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"cpf": rx}, {"card_number": rx}, {"phone": rx}]
    if service_type:
        query["service_type"] = service_type
    docs = await db.patients.find(query).sort("created_at", DESCENDING).to_list(limit)
    return [normalize(d) for d in docs]


@router.post("", response_model=Patient, status_code=201)
async def create_patient(body: PatientCreate, user=Depends(require(["admin", "recepcao"]))):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Informe o nome do paciente")
    if body.service_type not in SERVICE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de atendimento inválido")

    patient = Patient(
        name=name,
        birth_date=body.birth_date,
        cpf=body.cpf.strip(),
        phone=body.phone.strip(),
        card_number=body.card_number.strip(),
        service_type=body.service_type,
        notes=body.notes.strip(),
    )
    payload = patient.model_dump()

    if body.issue_ticket:
        prefix = SERVICE_PREFIXES.get(body.service_type, "A")
        ticket, seq, issue_date = await next_ticket(prefix)
        call = Call(
            ticket=ticket, prefix=prefix, seq=seq, issue_date=issue_date,
            service_type=body.service_type, patient_id=patient.id, patient_name=patient.name,
            status="aguardando",
        )
        await db.calls.insert_one(call.model_dump())
        payload["active_ticket"] = ticket

    await db.patients.insert_one(payload)
    return Patient(**payload)


@router.put("/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, body: PatientUpdate, user=Depends(require(["admin", "recepcao"]))):
    doc = await db.patients.find_one({"id": patient_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    if body.service_type not in SERVICE_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de atendimento inválido")

    updates = body.model_dump()
    updates["name"] = body.name.strip()
    await db.patients.update_one({"id": patient_id}, {"$set": updates})
    doc.update(updates)
    return normalize(doc)


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: str, user=Depends(require(["admin", "recepcao"]))):
    doc = await db.patients.find_one({"id": patient_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    await db.patients.delete_one({"id": patient_id})
    # a senha aguardando atendimento também sai da fila
    await db.calls.delete_many({"patient_id": patient_id, "status": "aguardando"})
