"""/api/stats — números do dashboard e dados de relatórios."""

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pymongo import ASCENDING, DESCENDING

from lib.db import db
from lib.dates import aware, today_iso
from models.hospital import Call, DashboardStats, DayRow, ReportRow, ReportsData
from routers.auth import current_user

router = APIRouter(prefix="/stats", tags=["stats"])


def normalize(doc: dict) -> Call:
    for field in ("created_at", "called_at", "finished_at"):
        doc[field] = aware(doc.get(field))
    return Call(**doc)


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(user=Depends(current_user)):
    today = today_iso()
    waiting = await db.calls.count_documents({"status": "aguardando"})
    in_service = await db.calls.count_documents({"status": "chamado"})
    finished_today = await db.calls.count_documents({"status": "finalizado", "issue_date": today})
    total_rooms = await db.rooms.count_documents({})
    occupied_rooms = await db.rooms.count_documents({"status": "em_atendimento"})

    recent_docs = await db.calls.find({"called_at": {"$ne": None}}).sort("called_at", DESCENDING).to_list(6)
    queue_docs = await db.calls.find({"status": "aguardando"}).sort("created_at", ASCENDING).to_list(10)

    return DashboardStats(
        waiting=waiting,
        in_service=in_service,
        finished_today=finished_today,
        occupied_rooms=occupied_rooms,
        total_rooms=total_rooms,
        recent=[normalize(d) for d in recent_docs],
        queue=[normalize(d) for d in queue_docs],
    )


@router.get("/reports", response_model=ReportsData)
async def reports(user=Depends(current_user)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    window = [normalize(d) for d in await db.calls.find({"created_at": {"$gte": cutoff}}).to_list(5000)]
    finalized_all = [normalize(d) for d in await db.calls.find({"status": "finalizado"}).to_list(5000)]
    finalized_7d = [c for c in window if c.status == "finalizado"]

    waits = [
        (c.called_at - c.created_at).total_seconds() / 60
        for c in finalized_7d
        if c.called_at and c.created_at
    ]
    avg_wait = round(sum(waits) / len(waits), 1) if waits else 0.0

    by_room = Counter((c.room_label or "Sem consultório") for c in finalized_7d)
    by_day = Counter(c.issue_date for c in window)
    by_type = Counter(c.service_type for c in window)

    return ReportsData(
        total_patients=await db.patients.count_documents({}),
        total_attendances=len(finalized_all),
        attendances_7d=len(finalized_7d),
        avg_wait_min=avg_wait,
        total_calls_7d=len(window),
        by_room=[ReportRow(label=k, count=v) for k, v in sorted(by_room.items())],
        by_day=[DayRow(date=k, count=v) for k, v in sorted(by_day.items())],
        by_type=[ReportRow(label=k, count=v) for k, v in sorted(by_type.items())],
    )
