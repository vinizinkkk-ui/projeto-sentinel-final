"""Ticket (senha) generation — daily sequence per service prefix (A, B, E, P)."""

from pymongo import DESCENDING

from lib.db import db
from lib.dates import today_iso


async def next_ticket(prefix: str) -> tuple[str, int, str]:
    """Returns (ticket, seq, issue_date). The sequence restarts each day per prefix."""
    issue_date = today_iso()
    last = await db.calls.find_one(
        {"issue_date": issue_date, "prefix": prefix},
        sort=[("seq", DESCENDING)],
    )
    seq = int(last["seq"]) + 1 if last else 1
    return f"{prefix}{seq:03d}", seq, issue_date
