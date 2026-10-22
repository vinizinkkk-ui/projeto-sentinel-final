"""Pydantic v2 models for the HMV hospital system.

Every model here is mirrored by a hand-written TS interface in
frontend/src/lib/types.ts — change the pair in the same edit.
"""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

ROLES = ["admin", "recepcao", "enfermagem", "medico"]
SERVICE_TYPES = ["Consulta", "Retorno", "Exame", "Urgência"]
SERVICE_PREFIXES = {"Consulta": "A", "Retorno": "B", "Exame": "E", "Urgência": "P"}
SERVICE_BY_PREFIX = {v: k for k, v in SERVICE_PREFIXES.items()}
CALL_STATUSES = ["aguardando", "chamado", "finalizado", "cancelado"]
ROOM_STATUSES = ["disponivel", "em_atendimento", "manutencao"]


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --- Usuários / autenticação ---
class LoginRequest(BaseModel):
    username: str
    password: str


class User(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    username: str
    role: str = "recepcao"
    specialty: str | None = None
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str = "recepcao"
    specialty: str | None = None


# --- Pacientes ---
class Patient(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    birth_date: str = ""
    cpf: str = ""
    phone: str = ""
    card_number: str = ""
    service_type: str = "Consulta"
    notes: str = ""
    active_ticket: str | None = None
    created_at: datetime = Field(default_factory=utcnow)


class PatientCreate(BaseModel):
    name: str
    birth_date: str = ""
    cpf: str = ""
    phone: str = ""
    card_number: str = ""
    service_type: str = "Consulta"
    notes: str = ""
    issue_ticket: bool = True


class PatientUpdate(BaseModel):
    name: str
    birth_date: str = ""
    cpf: str = ""
    phone: str = ""
    card_number: str = ""
    service_type: str = "Consulta"
    notes: str = ""


# --- Consultórios ---
class Room(BaseModel):
    id: str = Field(default_factory=new_id)
    number: int
    label: str
    status: str = "disponivel"
    current_ticket: str | None = None
    current_patient: str | None = None
    professional_name: str | None = None


class RoomCreate(BaseModel):
    number: int | None = None
    label: str | None = None


class RoomUpdate(BaseModel):
    status: str


# --- Chamadas / senhas ---
class Call(BaseModel):
    id: str = Field(default_factory=new_id)
    ticket: str
    prefix: str = "A"
    seq: int = 0
    issue_date: str = ""
    service_type: str = "Consulta"
    patient_id: str = ""
    patient_name: str = ""
    room_id: str | None = None
    room_label: str | None = None
    professional_id: str | None = None
    professional_name: str | None = None
    status: str = "aguardando"
    created_at: datetime = Field(default_factory=utcnow)
    called_at: datetime | None = None
    finished_at: datetime | None = None
    repeat_count: int = 0


class CallAssignRequest(BaseModel):
    room_id: str
    professional_id: str | None = None


# --- Estatísticas / relatórios ---
class DashboardStats(BaseModel):
    waiting: int = 0
    in_service: int = 0
    finished_today: int = 0
    occupied_rooms: int = 0
    total_rooms: int = 0
    recent: list[Call] = Field(default_factory=list)
    queue: list[Call] = Field(default_factory=list)


class ReportRow(BaseModel):
    label: str
    count: int


class DayRow(BaseModel):
    date: str
    count: int


class ReportsData(BaseModel):
    total_patients: int = 0
    total_attendances: int = 0
    attendances_7d: int = 0
    avg_wait_min: float = 0.0
    total_calls_7d: int = 0
    by_room: list[ReportRow] = Field(default_factory=list)
    by_day: list[DayRow] = Field(default_factory=list)
    by_type: list[ReportRow] = Field(default_factory=list)


# --- Configurações ---
class AppSettings(BaseModel):
    show_patient_name_on_tv: bool = True
    voice_enabled: bool = True
    sound_enabled: bool = True
