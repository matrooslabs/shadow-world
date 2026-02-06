# CLAUDE.md

## Project Overview

**World Substrate** — a World App Mini App for creating AI personality clones ("substrates"). Users connect social accounts (Twitter), the system extracts a personality profile using Claude, provisions an ElevenLabs Conversational AI agent with that personality, and others can chat with the clone via text or voice.

Built with Next.js 15 (frontend) + FastAPI (backend), running inside the World App ecosystem with wallet-based auth.

## Documentation

`llms-full.txt` contains World Mini App documentation in [llmstxt.org](https://llmstxt.org) format. Reference for MiniKit APIs, World ID integration, and mini app patterns.

## Commands

### Frontend (Next.js)
```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

### Backend (FastAPI)
```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000  # Dev server
```

Backend uses `uv` for dependency management. Virtual env at `backend/.venv/`. Use `backend/.venv/bin/python` for testing imports.

### Docker
```bash
docker compose up        # Runs PostgreSQL + backend + frontend
```

### Local dev with World App
1. `ngrok http 3000` for a public tunnel
2. Set `AUTH_URL` in `.env.local` to ngrok URL
3. Update app URL in developer.worldcoin.org

## Architecture

### Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, `@worldcoin/mini-apps-ui-kit-react`
- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL (prod) / SQLite (dev)
- **AI Chat**: ElevenLabs Conversational AI Agents (text + voice)
- **Personality Extraction**: Anthropic Claude via custom `ExtractionAgent`
- **Voice Cloning**: ElevenLabs Instant Voice Clone (IVC) API
- **Social Data**: Twitter OAuth 2.0 + tweet fetching

### Frontend → Backend Communication
Frontend calls the Python backend via `src/lib/substrate-api.ts` (REST client). Backend URL configured via `NEXT_PUBLIC_SUBSTRATE_API_URL` env var (defaults to `http://localhost:8000`).

### Backend Structure (`backend/`)
```
main.py                  # FastAPI app, CORS, router registration, lifespan
config.py                # Pydantic settings (env vars)
db.py                    # SQLAlchemy async engine, session factory, Base
api/
  substrates.py          # CRUD + extraction trigger for substrates
  agent.py               # ElevenLabs agent signed URL endpoint
  knowledge.py           # Knowledge base CRUD (add URL/text, delete)
  voice.py               # Voice sample upload + clone status
  oauth.py               # Twitter OAuth 2.0 flow (authorize + callback)
services/
  agent_service.py       # ElevenLabs agent CRUD, signed URL generation
  voice_service.py       # ElevenLabs voice cloning
agents/
  extraction_agent.py    # ExtractionAgent — Claude-based personality extraction
fetchers/
  twitter.py             # TwitterFetcher — fetch tweets via API
models/
  substrate.py           # Substrate model (+ SubstrateStatus, VoiceStatus enums)
  knowledge.py           # Knowledge model (+ KnowledgeSourceType, KnowledgeStatus)
  social_account.py      # SocialAccount model
```

### Frontend Route Structure
```
/                                    # Public landing/login
/(protected)/home                    # Home page
/(protected)/create                  # Create new substrate (multi-step)
/(protected)/registry                # Browse all substrates
/(protected)/substrate/[id]          # Substrate profile + management
/(protected)/substrate/[id]/chat     # Chat with substrate (text/voice)
/(protected)/profile                 # User profile
/(protected)/oauth/callback          # Twitter OAuth callback
/api/auth/[...nextauth]              # Auth API routes
/api/verify-proof                    # World ID proof verification
/api/verify-agent                    # Agent verification
/api/substrate                       # Substrate proxy route
```

### Key Frontend Components (`src/components/`)
- `Create/` — Multi-step substrate creation (BasicInfoForm, SocialLinker, ExtractionProgress)
- `Substrate/` — SubstrateCard, SubstrateProfile
- `Knowledge/` — Knowledge management (AddKnowledgeModal, VoiceRecorder)
- `Verification/` — VerifyAgentButton
- `AuthButton/` — Wallet auth trigger
- `Navigation/` — Bottom nav bar
- `PageLayout/` — Page wrapper

### Authentication Flow
- `@worldcoin/minikit-js` wallet auth + `next-auth` v5 beta for sessions
- Config: `src/auth/index.ts` — Credentials provider verifying SIWE messages
- Middleware: `middleware.ts` — Route protection
- Wallet helpers: `src/auth/wallet/` (client + server)

### Provider Stack (`src/providers/index.tsx`)
1. `ErudaProvider` — In-browser console (dev only)
2. `MiniKitProvider` — World App MiniKit
3. `SessionProvider` — next-auth session

### Core Flow: Substrate Creation
1. User creates substrate with display name + bio
2. User connects Twitter via OAuth 2.0 (PKCE)
3. System fetches tweets via `TwitterFetcher`
4. `ExtractionAgent` (Claude) analyzes tweets → personality profile (traits, interests, communication style, values, summary)
5. `AgentService` creates an ElevenLabs Conversational AI agent with the personality as system prompt
6. Optionally: user records voice sample → `VoiceService` clones voice via ElevenLabs IVC → agent gets custom voice

### Core Flow: Chat
1. Frontend requests a signed URL via `GET /substrates/{id}/agent/signed-url`
2. `AgentService` calls `client.conversational_ai.conversations.get_signed_url(agent_id=...)`
3. Frontend uses `@elevenlabs/react` `useConversation()` hook to connect
4. Text mode: `useConversation({ textOnly: true })` + `sendUserMessage(text)`
5. Voice mode: full duplex audio via WebSocket

## Environment Variables

### Frontend (`.env.local`)
- `AUTH_SECRET` — Generate with `npx auth secret`
- `AUTH_URL` — App URL (ngrok for dev, production URL for prod)
- `NEXT_PUBLIC_APP_ID` — From developer.worldcoin.org
- `NEXT_PUBLIC_SUBSTRATE_API_URL` — Backend URL (default: `http://localhost:8000`)

### Backend (`backend/.env`)
- `DATABASE_URL` — PostgreSQL connection string (or `sqlite:///substrate.db` for dev)
- `ANTHROPIC_API_KEY` — For Claude personality extraction
- `ELEVENLABS_API_KEY` — For agents, voice cloning, knowledge base
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — Twitter OAuth 2.0
- `TWITTER_REDIRECT_URI` — OAuth redirect (default: `http://localhost:3000/oauth/callback`)
- `TOKEN_ENCRYPTION_KEY` — Fernet key for encrypting OAuth tokens
- `APP_URL` — Frontend URL
- `CORS_ORIGINS` — JSON array of allowed origins

## Key Dependencies

### Frontend
- `@elevenlabs/react` — Conversational AI React hooks
- `@worldcoin/mini-apps-ui-kit-react` — World App design system
- `@worldcoin/minikit-js` / `minikit-react` — MiniKit SDK
- `next-auth` v5 beta — Authentication
- `iconoir-react` — Icons

### Backend
- `fastapi` + `uvicorn` — API framework
- `sqlalchemy` + `asyncpg` / `aiosqlite` — Async ORM
- `anthropic` — Claude SDK for personality extraction
- `elevenlabs` — ElevenLabs SDK (agents, voice cloning, knowledge base)
- `tweepy` / `httpx` — Twitter API
- `cryptography` — Fernet encryption for OAuth tokens
- `pydantic-settings` — Configuration management
