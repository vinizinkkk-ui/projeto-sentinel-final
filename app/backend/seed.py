"""Seed do banco de demonstração do HMV — Hospital Municipal Valparaíso.

Idempotente: se já existirem usuários, o seed é ignorado.
Executar: cd /app/backend && python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from lib.db import db, ensure_indexes
from lib.security import hash_password

TZ = ZoneInfo("America/Sao_Paulo")
SERVICE_BY_PREFIX = {"A": "Consulta", "B": "Retorno", "E": "Exame", "P": "Urgência"}

USERS = [
    # (nome, username, senha, papel, especialidade)
    ("Ana Martins Ribeiro", "admin", "admin123", "admin", "Administração hospitalar"),
    ("Fernanda Souza", "recepcao", "123456", "recepcao", "Recepção"),
    ("Patrícia Lima", "enfermagem", "123456", "enfermagem", "Enfermagem"),
    ("Dr. Carlos Almeida", "medico", "123456", "medico", "Clínico Geral"),
    ("Dra. Ana Beatriz Rocha", "medico.ana", "123456", "medico", "Pediatria"),
    ("Dr. Marcos Vieira", "medico.marcos", "123456", "medico", "Cardiologia"),
]

PATIENTS = [
    ("Maria Aparecida Silva", "1958-03-12", "521.442.710-20", "(61) 98812-3456", "SUS 700 2890 1122 0031", "Consulta", "Hipertensa, medicação contínua."),
    ("João Pedro Ferreira", "1990-07-25", "071.533.610-44", "(61) 99145-2233", "SUS 700 2890 1122 0044", "Consulta", ""),
    ("Antônia Rodrigues Lima", "1946-11-02", "289.405.720-18", "(61) 98222-7710", "SUS 700 2890 1122 0057", "Retorno", "Diabética; trazer exames anteriores."),
    ("Carlos Eduardo Souza", "1975-01-30", "405.821.930-62", "(61) 99674-1188", "SUS 700 2890 1122 0069", "Consulta", ""),
    ("Fernanda Alves Costa", "1988-09-14", "612.337.480-95", "(61) 98455-6321", "SUS 700 2890 1122 0071", "Exame", "Jejuar 8h antes da coleta."),
    ("Lucas Martins Oliveira", "2015-04-08", "845.902.160-33", "(61) 99318-4095", "SUS 700 2890 1122 0083", "Urgência", "Acompanhado pela mãe."),
    ("Regina Célia Pereira", "1962-12-21", "103.768.250-71", "(61) 98109-5544", "SUS 700 2890 1122 0096", "Consulta", "Chega sempre com antecedência."),
    ("Otávio Barbosa Nogueira", "1983-06-17", "321.654.980-27", "(61) 99788-2210", "SUS 700 2890 1122 0108", "Retorno", ""),
    ("Heloísa Santos Cardoso", "1996-02-05", "556.190.470-88", "(61) 98233-9001", "SUS 700 2890 1122 0110", "Consulta", ""),
    ("Gustavo Henrique Ribeiro", "2001-08-29", "778.321.650-14", "(61) 99406-7788", "SUS 700 2890 1122 0122", "Consulta", ""),
    ("Mariana Duarte Freitas", "1969-05-11", "889.506.240-59", "(61) 98017-3312", "SUS 700 2890 1122 0135", "Exame", "Mobilidade reduzida."),
    ("Roberto Carlos Mendes", "1954-10-07", "090.771.830-26", "(61) 99551-0044", "SUS 700 2890 1122 0147", "Retorno", "Cardíaco; prioridade em fila."),
    ("Beatriz Lopes Moraes", "1999-03-23", "167.884.920-31", "(61) 99620-8877", "SUS 700 2890 1122 0159", "Urgência", ""),
    ("Paulo Vinícius Teixeira", "1972-07-04", "245.913.760-42", "(61) 98390-1122", "SUS 700 2890 1122 0161", "Consulta", ""),
]


def sp_date(dt: datetime) -> str:
    return dt.astimezone(TZ).strftime("%Y-%m-%d")


async def seed() -> None:
    await ensure_indexes()
    if await db.users.count_documents({}) > 0:
        print("Banco já possui dados — seed ignorado (idempotente).")
        return

    now = datetime.now(timezone.utc)

    users = [
        {
            "id": str(uuid.uuid4()), "name": name, "username": username, "role": role,
            "specialty": specialty, "active": True, "created_at": now,
            "password_hash": hash_password(password),
        }
        for name, username, password, role, specialty in USERS
    ]
    await db.users.insert_many(users)
    by_username = {u["username"]: u for u in users}
    carlos = by_username["medico"]
    ana = by_username["medico.ana"]
    marcos = by_username["medico.marcos"]

    rooms = [
        {
            "id": str(uuid.uuid4()), "number": n, "label": f"Consultório {n:02d}",
            "status": "disponivel", "current_ticket": None, "current_patient": None,
            "professional_name": None,
        }
        for n in range(1, 7)
    ]
    await db.rooms.insert_many(rooms)
    room_by_number = {r["number"]: r for r in rooms}

    patients = [
        {
            "id": str(uuid.uuid4()), "name": name, "birth_date": birth, "cpf": cpf, "phone": phone,
            "card_number": card, "service_type": service, "notes": notes,
            "active_ticket": None, "created_at": now - timedelta(days=30 - i, minutes=i * 7),
        }
        for i, (name, birth, cpf, phone, card, service, notes) in enumerate(PATIENTS)
    ]
    await db.patients.insert_many(patients)

    calls = []

    # --- histórico dos 6 dias anteriores (alimenta os relatórios) ---
    for d in range(1, 7):
        day = now - timedelta(days=d)
        seqs = {"A": 0, "B": 0, "E": 0}
        prefixes_cycle = ["A", "A", "B", "A", "B", "E"]
        for i in range(6):
            prefix = prefixes_cycle[i]
            seqs[prefix] += 1
            created = (day - timedelta(hours=1)).replace(hour=12, minute=8 + i * 9, second=0, microsecond=0)
            called = created + timedelta(minutes=14 + (i * 7) % 38)
            finished = called + timedelta(minutes=11 + (i * 5) % 22)
            room = room_by_number[(i % 6) + 1]
            doctor = [carlos, ana, marcos][i % 3]
            patient = patients[(d + i) % 8]
            calls.append({
                "id": str(uuid.uuid4()), "ticket": f"{prefix}{seqs[prefix]:03d}",
                "prefix": prefix, "seq": seqs[prefix], "issue_date": sp_date(created),
                "service_type": SERVICE_BY_PREFIX[prefix],
                "patient_id": patient["id"], "patient_name": patient["name"],
                "room_id": room["id"], "room_label": room["label"],
                "professional_id": doctor["id"], "professional_name": doctor["name"],
                "status": "finalizado", "created_at": created, "called_at": called,
                "finished_at": finished, "repeat_count": 0,
            })

    # --- hoje: atendimentos já finalizados ---
    # (índice do paciente, prefixo, consultório, médico, criado/cchamado/finalizado há X min)
    today_finalized = [
        (0, "A", 1, carlos, 210, 180, 160),
        (1, "A", 1, carlos, 180, 150, 130),
        (2, "B", 2, ana, 160, 120, 100),
        (3, "A", 3, marcos, 140, 110, 90),
        (4, "E", 4, carlos, 120, 95, 75),
        (5, "P", 2, ana, 100, 85, 62),
        (6, "A", 1, carlos, 80, 60, 40),
        (7, "B", 3, marcos, 70, 50, 30),
    ]
    seqs = {"A": 0, "B": 0, "E": 0, "P": 0}
    for idx, prefix, room_number, doctor, c_min, k_min, f_min in today_finalized:
        seqs[prefix] += 1
        created = now - timedelta(minutes=c_min)
        room = room_by_number[room_number]
        patient = patients[idx]
        calls.append({
            "id": str(uuid.uuid4()), "ticket": f"{prefix}{seqs[prefix]:03d}",
            "prefix": prefix, "seq": seqs[prefix], "issue_date": sp_date(created),
            "service_type": SERVICE_BY_PREFIX[prefix],
            "patient_id": patient["id"], "patient_name": patient["name"],
            "room_id": room["id"], "room_label": room["label"],
            "professional_id": doctor["id"], "professional_name": doctor["name"],
            "status": "finalizado", "created_at": created,
            "called_at": now - timedelta(minutes=k_min),
            "finished_at": now - timedelta(minutes=f_min), "repeat_count": 0,
        })

    # --- chamada ativa (aparece na TV imediatamente) ---
    seqs["A"] += 1
    active_ticket = f"A{seqs['A']:03d}"
    active_patient = patients[8]
    room2 = room_by_number[2]
    calls.append({
        "id": str(uuid.uuid4()), "ticket": active_ticket,
        "prefix": "A", "seq": seqs["A"], "issue_date": sp_date(now),
        "service_type": "Consulta",
        "patient_id": active_patient["id"], "patient_name": active_patient["name"],
        "room_id": room2["id"], "room_label": room2["label"],
        "professional_id": carlos["id"], "professional_name": carlos["name"],
        "status": "chamado", "created_at": now - timedelta(minutes=40),
        "called_at": now - timedelta(minutes=12), "finished_at": None, "repeat_count": 0,
    })

    # --- fila de espera (senhas aguardando) ---
    waiting = [(9, "A"), (10, "E"), (11, "B"), (12, "P"), (13, "A")]
    waiting_tickets: dict[int, str] = {}
    for idx, prefix in waiting:
        seqs[prefix] += 1
        patient = patients[idx]
        ticket = f"{prefix}{seqs[prefix]:03d}"
        waiting_tickets[idx] = ticket
        calls.append({
            "id": str(uuid.uuid4()), "ticket": ticket,
            "prefix": prefix, "seq": seqs[prefix], "issue_date": sp_date(now),
            "service_type": SERVICE_BY_PREFIX[prefix],
            "patient_id": patient["id"], "patient_name": patient["name"],
            "room_id": None, "room_label": None,
            "professional_id": None, "professional_name": None,
            "status": "aguardando", "created_at": now - timedelta(minutes=5 + (14 - idx) * 3),
            "called_at": None, "finished_at": None, "repeat_count": 0,
        })

    await db.calls.insert_many(calls)

    # consultório 02 está em atendimento agora
    await db.rooms.update_one({"id": room2["id"]}, {"$set": {
        "status": "em_atendimento",
        "current_ticket": active_ticket,
        "current_patient": active_patient["name"],
        "professional_name": carlos["name"],
    }})

    # senhas ativas na fila de espera
    for idx, ticket in waiting_tickets.items():
        await db.patients.update_one({"id": patients[idx]["id"]}, {"$set": {"active_ticket": ticket}})

    # configurações iniciais
    await db.settings.update_one(
        {"key": "general"},
        {"$set": {"show_patient_name_on_tv": True, "voice_enabled": True, "sound_enabled": True}},
        upsert=True,
    )

    print(
        f"Seed concluído: {len(users)} usuários, {len(rooms)} consultórios, "
        f"{len(patients)} pacientes, {len(calls)} chamadas."
    )


if __name__ == "__main__":
    asyncio.run(seed())
