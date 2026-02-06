import logging

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from db import get_db
from models import Substrate, Knowledge, KnowledgeSourceType, KnowledgeStatus
from services import AgentService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["knowledge"])


class AddKnowledgeRequest(BaseModel):
    source_type: str  # "url" or "text"
    content: str
    title: Optional[str] = None


class KnowledgeResponse(BaseModel):
    id: str
    substrate_id: str
    source_type: str
    source_url: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    elevenlabs_doc_id: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


async def _process_knowledge(
    knowledge_id: str,
    substrate_id: str,
    source_type: KnowledgeSourceType,
    content: str,
    title: Optional[str],
    db: AsyncSession,
):
    """Background task to add knowledge via ElevenLabs KB API."""
    result = await db.execute(
        select(Knowledge).where(Knowledge.id == knowledge_id)
    )
    knowledge = result.scalar_one_or_none()
    if not knowledge:
        return

    # Get substrate to check for agent_id
    sub_result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = sub_result.scalar_one_or_none()

    try:
        agent_service = AgentService()

        if source_type == KnowledgeSourceType.URL:
            doc_id = agent_service.add_knowledge_from_url(
                url=content,
                name=title or content,
            )
        else:
            doc_id = agent_service.add_knowledge_from_text(
                text=content,
                name=title or "Text document",
            )

        knowledge.elevenlabs_doc_id = doc_id
        knowledge.status = KnowledgeStatus.READY

        # Associate document with the agent if it exists
        if substrate and substrate.agent_id:
            try:
                agent_service.add_knowledge_to_agent(substrate.agent_id, doc_id)
            except Exception as e:
                logger.error(f"Failed to associate doc {doc_id} with agent {substrate.agent_id}: {e}")

        await db.commit()

    except Exception as e:
        logger.error(f"Failed to process knowledge {knowledge_id}: {e}")
        knowledge.status = KnowledgeStatus.FAILED
        knowledge.error_message = str(e)
        await db.commit()


@router.post("/substrates/{substrate_id}/knowledge", response_model=KnowledgeResponse)
async def add_knowledge(
    substrate_id: str,
    request: AddKnowledgeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Add a knowledge entry to a substrate via ElevenLabs Knowledge Base."""
    # Verify substrate exists
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()
    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    # Validate source_type
    if request.source_type not in ("url", "text"):
        raise HTTPException(status_code=400, detail="source_type must be 'url' or 'text'")

    source_type = KnowledgeSourceType(request.source_type)

    knowledge = Knowledge(
        substrate_id=substrate_id,
        source_type=source_type,
        source_url=request.content if source_type == KnowledgeSourceType.URL else None,
        title=request.title,
        content=request.content if source_type == KnowledgeSourceType.TEXT else None,
        status=KnowledgeStatus.PROCESSING,
    )

    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)

    # Process in background (both URL and text go through ElevenLabs API)
    background_tasks.add_task(
        _process_knowledge, knowledge.id, substrate_id, source_type, request.content, request.title, db
    )

    return KnowledgeResponse(**knowledge.to_dict())


@router.get("/substrates/{substrate_id}/knowledge", response_model=list[KnowledgeResponse])
async def list_knowledge(
    substrate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge entries for a substrate."""
    # Verify substrate exists
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Substrate not found")

    entries_result = await db.execute(
        select(Knowledge)
        .where(Knowledge.substrate_id == substrate_id)
        .order_by(Knowledge.created_at.desc())
    )
    entries = entries_result.scalars().all()

    return [KnowledgeResponse(**e.to_dict()) for e in entries]


@router.delete("/substrates/{substrate_id}/knowledge/{knowledge_id}")
async def delete_knowledge(
    substrate_id: str,
    knowledge_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a knowledge entry and its ElevenLabs KB document."""
    result = await db.execute(
        select(Knowledge).where(
            Knowledge.id == knowledge_id,
            Knowledge.substrate_id == substrate_id,
        )
    )
    knowledge = result.scalar_one_or_none()
    if not knowledge:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")

    # Delete from ElevenLabs KB
    if knowledge.elevenlabs_doc_id:
        try:
            agent_service = AgentService()
            agent_service.delete_knowledge_document(knowledge.elevenlabs_doc_id)
        except Exception as e:
            logger.warning(f"Failed to delete ElevenLabs doc {knowledge.elevenlabs_doc_id}: {e}")

    # Delete from DB
    await db.delete(knowledge)
    await db.commit()

    return {"status": "deleted", "id": knowledge_id}
