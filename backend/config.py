from pydantic_settings import BaseSettings
from functools import lru_cache
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://localhost/substrate"

    # Anthropic
    anthropic_api_key: str

    # Twitter OAuth 2.0
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    twitter_redirect_uri: str = "http://localhost:3000/oauth/callback"

    # Encryption key for OAuth tokens (Fernet key)
    token_encryption_key: str

    # App settings
    app_url: str = "http://localhost:3000"
    cors_origins: str = '["*"]'  # JSON string, parsed in get_cors_origins()

    @property
    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.cors_origins)
        except json.JSONDecodeError:
            return ["*"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
