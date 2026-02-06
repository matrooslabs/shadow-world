from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from db import Base
from cryptography.fernet import Fernet
from config import get_settings
import uuid


def get_cipher():
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode())


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    substrate_id = Column(String, ForeignKey("substrates.id"), nullable=False, index=True)
    platform = Column(String, nullable=False)  # "twitter"
    platform_user_id = Column(String, nullable=True)
    username = Column(String, nullable=True)
    encrypted_access_token = Column(Text, nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    substrate = relationship("Substrate", back_populates="social_accounts")

    def set_access_token(self, token: str) -> None:
        """Encrypt and store access token."""
        cipher = get_cipher()
        self.encrypted_access_token = cipher.encrypt(token.encode()).decode()

    def get_access_token(self) -> str | None:
        """Decrypt and return access token."""
        if not self.encrypted_access_token:
            return None
        cipher = get_cipher()
        return cipher.decrypt(self.encrypted_access_token.encode()).decode()

    def set_refresh_token(self, token: str) -> None:
        """Encrypt and store refresh token."""
        cipher = get_cipher()
        self.encrypted_refresh_token = cipher.encrypt(token.encode()).decode()

    def get_refresh_token(self) -> str | None:
        """Decrypt and return refresh token."""
        if not self.encrypted_refresh_token:
            return None
        cipher = get_cipher()
        return cipher.decrypt(self.encrypted_refresh_token.encode()).decode()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "substrate_id": self.substrate_id,
            "platform": self.platform,
            "username": self.username,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
        }
