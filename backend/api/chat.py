import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from db import get_db
from models import Substrate, SubstrateStatus, VoiceStatus, ChatSession, ChatMessage, MessageRole
from agents import ChatAgent
from services import VoiceService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    visitor_wallet: str
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: str
    audio_base64: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/substrates/{substrate_id}/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    substrate_id: str,
    request: ChatRequest,
    voice: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to chat with a substrate."""
    # Get substrate
    result = await db.execute(
        select(Substrate).where(Substrate.id == substrate_id)
    )
    substrate = result.scalar_one_or_none()

    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    if substrate.status != SubstrateStatus.READY:
        raise HTTPException(
            status_code=400,
            detail="Substrate is not ready for chat",
        )

    if not substrate.personality_profile:
        raise HTTPException(
            status_code=400,
            detail="Substrate has no personality profile",
        )

    # Get or create chat session
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.substrate_id == substrate_id,
            ChatSession.visitor_wallet == request.visitor_wallet,
        )
    )
    session = session_result.scalar_one_or_none()

    if not session:
        session = ChatSession(
            substrate_id=substrate_id,
            visitor_wallet=request.visitor_wallet,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # Get message history
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    messages = messages_result.scalars().all()
    message_history = [m.to_dict() for m in messages]

    # Save user message
    user_message = ChatMessage(
        session_id=session.id,
        role=MessageRole.USER,
        content=request.message,
    )
    db.add(user_message)
    await db.commit()

    # Generate response
    agent = ChatAgent()
    response_content = await agent.chat(
        personality_profile=substrate.personality_profile,
        display_name=substrate.display_name,
        message_history=message_history,
        user_message=request.message,
        substrate_id=substrate_id,
    )

    # Save assistant message
    assistant_message = ChatMessage(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        content=response_content,
    )
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)

    response = ChatMessageResponse(**assistant_message.to_dict())

    # Generate voice audio if requested
    if voice:
        if substrate.voice_status != VoiceStatus.READY or not substrate.voice_id:
            raise HTTPException(status_code=400, detail="Voice is not ready")
        try:
            service = VoiceService()
            response.audio_base64 = service.text_to_speech_base64(
                substrate.voice_id, response_content
            )
        except Exception as e:
            logger.error(f"TTS failed for substrate {substrate_id}: {e}")
            # Graceful degradation: return text response without audio

    return response


@router.get("/substrates/{substrate_id}/chat/history", response_model=list[ChatMessageResponse])
async def get_chat_history(
    substrate_id: str,
    visitor_wallet: str,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a visitor with a substrate."""
    # Get session
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.substrate_id == substrate_id,
            ChatSession.visitor_wallet == visitor_wallet,
        )
    )
    session = session_result.scalar_one_or_none()

    if not session:
        return []

    # Get messages
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    messages = messages_result.scalars().all()

    return [ChatMessageResponse(**m.to_dict()) for m in messages]
