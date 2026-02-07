from .substrates import router as substrates_router
from .oauth import router as oauth_router
from .chat import router as chat_router
from .knowledge import router as knowledge_router
from .voice import router as voice_router

__all__ = ["substrates_router", "oauth_router", "chat_router", "knowledge_router", "voice_router"]
