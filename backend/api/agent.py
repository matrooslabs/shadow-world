from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_db
from models import Substrate
from services import AgentService

router = APIRouter(tags=["agent"])


@router.get("/substrates/{substrate_id}/agent/signed-url")
async def get_agent_signed_url(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a signed URL to start a conversation with the substrate's agent."""
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    if not substrate.agent_id:
        raise HTTPException(status_code=400, detail="Substrate has no agent configured")

    agent_service = AgentService()
    signed_url = agent_service.get_signed_url(substrate.agent_id)

    return {"signed_url": signed_url}
