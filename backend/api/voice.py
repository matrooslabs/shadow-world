import os
import tempfile
import logging

import mutagen
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db import get_db
from models import Substrate, VoiceStatus
from services import VoiceService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])

ALLOWED_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
    "audio/webm",
}
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MIN_DURATION_SECONDS = 120  # 2 minutes


async def _create_voice_clone(substrate_id: str, audio_path: str, voice_name: str, db: AsyncSession):
    """Background task to create a voice clone via ElevenLabs."""
    try:
        service = VoiceService()
        voice_id = service.create_voice_clone(voice_name, audio_path)

        result = await db.execute(
            select(Substrate).where(Substrate.id == substrate_id)
        )
        substrate = result.scalar_one_or_none()
        if substrate:
            substrate.voice_id = voice_id
            substrate.voice_status = VoiceStatus.READY
            await db.commit()
    except Exception as e:
        logger.error(f"Voice clone creation failed for substrate {substrate_id}: {e}")
        result = await db.execute(
            select(Substrate).where(Substrate.id == substrate_id)
        )
        substrate = result.scalar_one_or_none()
        if substrate:
            substrate.voice_status = VoiceStatus.FAILED
            await db.commit()
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


@router.post("/substrates/{substrate_id}/voice")
async def upload_voice(
    substrate_id: str,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload audio and create a voice clone for a substrate."""
    # Validate substrate exists
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()
    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    # Validate content type
    ext = os.path.splitext(audio.filename or "")[1].lower()
    if audio.content_type not in ALLOWED_CONTENT_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: mp3, wav, m4a",
        )

    # Read file and validate size
    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Maximum file size: 50MB")

    # Save to temp file for duration validation and ElevenLabs upload
    suffix = ext or ".mp3"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(content)
        tmp.close()

        # Validate duration
        audio_info = mutagen.File(tmp.name)
        if audio_info is None or audio_info.info is None:
            raise HTTPException(status_code=400, detail="Could not read audio file")
        if audio_info.info.length < MIN_DURATION_SECONDS:
            os.remove(tmp.name)
            raise HTTPException(
                status_code=400,
                detail="Audio must be at least 2 minutes",
            )
    except HTTPException:
        raise
    except Exception:
        if os.path.exists(tmp.name):
            os.remove(tmp.name)
        raise HTTPException(status_code=400, detail="Could not read audio file")

    # If substrate already has a voice, delete old one
    if substrate.voice_id:
        try:
            service = VoiceService()
            service.delete_voice(substrate.voice_id)
        except Exception as e:
            logger.warning(f"Failed to delete old voice {substrate.voice_id}: {e}")

    # Set status to pending
    voice_name = f"{substrate.display_name} Voice"
    substrate.voice_status = VoiceStatus.PENDING
    substrate.voice_name = voice_name
    substrate.voice_id = None
    await db.commit()

    # Kick off background clone creation
    background_tasks.add_task(_create_voice_clone, substrate_id, tmp.name, voice_name, db)

    return {"message": "Voice upload received, cloning in progress", "voice_status": "pending"}


@router.get("/substrates/{substrate_id}/voice/status")
async def get_voice_status(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Check voice clone readiness for a substrate."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()
    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    return {
        "voice_status": substrate.voice_status.value if substrate.voice_status else None,
        "voice_name": substrate.voice_name,
        "has_voice": substrate.voice_id is not None and substrate.voice_status == VoiceStatus.READY,
    }


@router.delete("/substrates/{substrate_id}/voice")
async def delete_voice(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a voice clone from a substrate."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()
    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    if not substrate.voice_id:
        raise HTTPException(status_code=400, detail="Substrate has no voice")

    # Delete from ElevenLabs
    try:
        service = VoiceService()
        service.delete_voice(substrate.voice_id)
    except Exception as e:
        logger.warning(f"Failed to delete voice from ElevenLabs: {e}")

    # Clear DB fields
    substrate.voice_id = None
    substrate.voice_status = None
    substrate.voice_name = None
    await db.commit()

    return {"message": "Voice deleted"}
