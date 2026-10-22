"""/api/settings — preferências do sistema (leitura pública para a TV; escrita: admin)."""

from fastapi import APIRouter, Depends

from lib.db import db
from models.hospital import AppSettings
from routers.auth import require

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_KEY = "general"


async def _settings_doc() -> dict:
    doc = await db.settings.find_one({"key": SETTINGS_KEY})
    if not doc:
        defaults = AppSettings()
        await db.settings.update_one({"key": SETTINGS_KEY}, {"$set": defaults.model_dump()}, upsert=True)
        return defaults.model_dump()
    return doc


@router.get("", response_model=AppSettings)
async def read_settings():
    doc = await _settings_doc()
    return AppSettings(
        show_patient_name_on_tv=doc.get("show_patient_name_on_tv", True),
        voice_enabled=doc.get("voice_enabled", True),
        sound_enabled=doc.get("sound_enabled", True),
    )


@router.put("", response_model=AppSettings)
async def update_settings(body: AppSettings, user=Depends(require(["admin"]))):
    await db.settings.update_one({"key": SETTINGS_KEY}, {"$set": body.model_dump()}, upsert=True)
    return body
