import logging
import uuid

import anthropic
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from config import get_settings
from db import get_db
from models import Substrate, Knowledge, KnowledgeSourceType, KnowledgeStatus
from vectorstore import chunk_text, add_knowledge_chunks, delete_knowledge_chunks

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
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


async def _fetch_url_with_claude(url: str) -> dict:
    """Use Claude's web fetch tool to retrieve and extract content from a URL.

    Returns {"title": str|None, "content": str, "error": str|None}
    """
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""Fetch the content from this URL and extract the main article/page content as clean plain text.
Remove navigation, ads, footers, sidebars, cookie notices, and other non-content elements.
Return ONLY the cleaned content — no commentary, no markdown formatting, no preamble.
Preserve the original structure (headings, paragraphs, lists) as plain text.

URL: {url}""",
        }],
        tools=[{
            "type": "web_fetch_20250910",
            "name": "web_fetch",
            "max_uses": 1,
            "max_content_tokens": 50000,
        }],
        extra_headers={
            "anthropic-beta": "web-fetch-2025-09-10",
        },
    )

    # Extract title from web_fetch_tool_result if available
    title = None
    has_fetch_error = None
    for block in response.content:
        if block.type == "web_fetch_tool_result":
            content = block.content
            if hasattr(content, "type") and content.type == "web_fetch_tool_error":
                has_fetch_error = getattr(content, "error_code", "unknown_error")
            elif hasattr(content, "content") and hasattr(content.content, "title"):
                title = content.content.title

    if has_fetch_error:
        return {"title": None, "content": "", "error": f"Web fetch failed: {has_fetch_error}"}

    # Extract Claude's text response (the cleaned content)
    text_parts = [block.text for block in response.content if block.type == "text" and block.text.strip()]
    content = "\n\n".join(text_parts)

    if not content.strip():
        return {"title": title, "content": "", "error": "No content extracted from URL"}

    return {"title": title, "content": content, "error": None}


async def _process_url_knowledge(knowledge_id: str, url: str, substrate_id: str, db: AsyncSession):
    """Background task to fetch URL content and vectorize it."""
    result = await db.execute(
        select(Knowledge).where(Knowledge.id == knowledge_id)
    )
    knowledge = result.scalar_one_or_none()

    if not knowledge:
        return

    try:
        fetched = await _fetch_url_with_claude(url)

        if fetched["error"]:
            knowledge.status = KnowledgeStatus.FAILED
            knowledge.error_message = fetched["error"]
            await db.commit()
            return

        knowledge.content = fetched["content"]
        if fetched["title"] and not knowledge.title:
            knowledge.title = fetched["title"]

        # Chunk and vectorize
        chunks = chunk_text(fetched["content"])
        count = add_knowledge_chunks(substrate_id, knowledge_id, chunks)

        knowledge.chunk_count = count
        knowledge.status = KnowledgeStatus.READY
        await db.commit()

    except Exception as e:
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
    """Add a knowledge entry to a substrate."""
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
        id=str(uuid.uuid4()),
        substrate_id=substrate_id,
        source_type=source_type,
        source_url=request.content if source_type == KnowledgeSourceType.URL else None,
        title=request.title,
    )

    if source_type == KnowledgeSourceType.TEXT:
        # Process text inline — chunk and vectorize immediately
        knowledge.content = request.content
        chunks = chunk_text(request.content)
        count = add_knowledge_chunks(substrate_id, knowledge.id, chunks)
        knowledge.chunk_count = count
        knowledge.status = KnowledgeStatus.READY
    else:
        # URL: process in background
        knowledge.status = KnowledgeStatus.PROCESSING

    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)

    if source_type == KnowledgeSourceType.URL:
        background_tasks.add_task(_process_url_knowledge, knowledge.id, request.content, substrate_id, db)

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
    """Delete a knowledge entry and its ChromaDB vectors."""
    result = await db.execute(
        select(Knowledge).where(
            Knowledge.id == knowledge_id,
            Knowledge.substrate_id == substrate_id,
        )
    )
    knowledge = result.scalar_one_or_none()
    if not knowledge:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")

    # Delete from ChromaDB
    delete_knowledge_chunks(knowledge_id)

    # Delete from DB
    await db.delete(knowledge)
    await db.commit()

    return {"status": "deleted", "id": knowledge_id}
