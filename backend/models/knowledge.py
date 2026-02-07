from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
import uuid


class KnowledgeSourceType(str, PyEnum):
    URL = "url"
    TEXT = "text"


class KnowledgeStatus(str, PyEnum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Knowledge(Base):
    __tablename__ = "knowledge"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    substrate_id = Column(String, ForeignKey("substrates.id"), nullable=False, index=True)
    source_type = Column(Enum(KnowledgeSourceType), nullable=False)
    source_url = Column(String, nullable=True)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    status = Column(Enum(KnowledgeStatus), default=KnowledgeStatus.PROCESSING)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    substrate = relationship("Substrate", back_populates="knowledge_entries")

    def to_dict(self) -> dict:
        content_preview = self.content[:500] if self.content else None
        return {
            "id": self.id,
            "substrate_id": self.substrate_id,
            "source_type": self.source_type.value if self.source_type else None,
            "source_url": self.source_url,
            "title": self.title,
            "content": content_preview,
            "chunk_count": self.chunk_count,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
