from .substrates import router as substrates_router
from .oauth import router as oauth_router
from .knowledge import router as knowledge_router
from .voice import router as voice_router
from .agent import router as agent_router

__all__ = ["substrates_router", "oauth_router", "knowledge_router", "voice_router", "agent_router"]
