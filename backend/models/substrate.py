from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import Column, String, DateTime, Enum, Text, JSON
from sqlalchemy.orm import relationship
from db import Base
import uuid


class SubstrateStatus(str, PyEnum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    READY = "ready"
    FAILED = "failed"


class Substrate(Base):
    __tablename__ = "substrates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_wallet = Column(String, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    personality_profile = Column(JSON, nullable=True)
    status = Column(Enum(SubstrateStatus), default=SubstrateStatus.PENDING)
    extraction_progress = Column(String, default="0")  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    social_accounts = relationship("SocialAccount", back_populates="substrate", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="substrate", cascade="all, delete-orphan")
    knowledge_entries = relationship("Knowledge", back_populates="substrate", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "owner_wallet": self.owner_wallet,
            "display_name": self.display_name,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "personality_profile": self.personality_profile,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
