# CLAUDE.md

## Overview

**Shadowverse** — World App Mini App for creating AI personality clones ("Shadows"). Users connect Twitter, system extracts personality via Claude, provisions an ElevenLabs Conversational AI agent, and others chat with the clone (text/voice). Next.js 15 + FastAPI, wallet-based auth.

`llms-full.txt` — World Mini App docs (MiniKit APIs, World ID, mini app patterns).

## Commands

```bash
npm run dev / build / lint / start          # Frontend (port 3000)
cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000  # Backend
docker compose up                           # Full stack (Postgres + backend + frontend)
```

Backend uses `uv` for deps. Venv: `backend/.venv/`.

## Architecture

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4, `@worldcoin/mini-apps-ui-kit-react`
**Backend**: FastAPI, SQLAlchemy (async), PostgreSQL (prod) / SQLite (dev)
**AI**: ElevenLabs Conversational AI (chat), Claude (personality extraction), ElevenLabs IVC (voice cloning)
**Social**: Twitter OAuth 2.0 + tweet fetching

Frontend calls backend via `src/lib/substrate-api.ts`. URL: `NEXT_PUBLIC_SUBSTRATE_API_URL` (default `http://localhost:8000`).

### Backend (`backend/`)

- `main.py` — app, CORS, routers | `config.py` — settings | `db.py` — async engine
- `api/` — `substrates.py` (CRUD+extraction), `agent.py` (signed URLs), `knowledge.py`, `voice.py`, `oauth.py` (Twitter)
- `services/` — `agent_service.py` (ElevenLabs agents), `voice_service.py` (voice cloning)
- `agents/extraction_agent.py` — Claude personality extraction
- `fetchers/twitter.py` — tweet fetching
- `models/` — `substrate.py`, `knowledge.py`, `social_account.py`

### Frontend Routes

- `/` landing | `/(protected)/home` | `/(protected)/create` | `/(protected)/registry`
- `/(protected)/substrate/[id]` profile | `/(protected)/substrate/[id]/chat` chat
- `/(protected)/profile` | `/(protected)/oauth/callback`
- `/api/auth/[...nextauth]` | `/api/verify-proof` | `/api/verify-agent` | `/api/substrate`

### Key Components (`src/components/`)

`Create/` (BasicInfoForm, SocialLinker, ExtractionProgress) | `Substrate/` (Card, Profile) | `Knowledge/` (AddKnowledgeModal, VoiceRecorder) | `Verification/` | `AuthButton/` | `Navigation/` | `PageLayout/`

### Auth

`@worldcoin/minikit-js` wallet auth + `next-auth` v5 beta. Config: `src/auth/index.ts`. Middleware: `middleware.ts`. Wallet helpers: `src/auth/wallet/`.

### Core Flows

**Creation**: Create substrate (name+bio) → Connect Twitter (OAuth PKCE) → Fetch tweets → Claude extracts personality → ElevenLabs agent created → Optional: voice sample → IVC clone

**Chat**: `GET /substrates/{id}/agent/signed-url` → `@elevenlabs/react` `useConversation()` → text (`textOnly: true` + `sendUserMessage`) or voice (duplex WebSocket)

## Environment Variables

**Frontend** (`.env.local`): `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_ID`, `NEXT_PUBLIC_SUBSTRATE_API_URL`
**Backend** (`backend/.env`): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `TWITTER_CLIENT_ID`/`TWITTER_CLIENT_SECRET`, `TWITTER_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `APP_URL`, `CORS_ORIGINS`
