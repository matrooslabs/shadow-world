from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from db import engine, Base
from api import substrates_router, oauth_router, chat_router, knowledge_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()


app = FastAPI(
    title="Substrate API",
    description="Backend API for World Substrate Mini App",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(substrates_router)
app.include_router(oauth_router)
app.include_router(chat_router)
app.include_router(knowledge_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "substrate-api"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
