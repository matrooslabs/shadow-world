# World Substrate

A [World App](https://worldcoin.org/world-app) Mini App for creating AI personality clones ("substrates"). Connect your Twitter account, and the system extracts your personality profile using Claude, provisions a conversational AI agent with that personality, and lets others chat with your clone via text or voice.

## How It Works

1. **Create a substrate** — Set a display name and bio
2. **Connect Twitter** — OAuth 2.0 links your account and fetches your tweets
3. **Personality extraction** — Claude analyzes your tweets to build a personality profile (traits, interests, communication style, values)
4. **AI agent provisioned** — An ElevenLabs Conversational AI agent is created with your personality as its system prompt
5. **Voice cloning** (optional) — Record a voice sample to give your substrate a custom cloned voice
6. **Chat** — Anyone can talk to your substrate via text or full-duplex voice

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy (async), PostgreSQL / SQLite |
| AI Chat | ElevenLabs Conversational AI Agents |
| Personality Extraction | Anthropic Claude |
| Voice Cloning | ElevenLabs Instant Voice Clone |
| Auth | World App wallet auth (MiniKit) + next-auth v5 |
| Social Data | Twitter OAuth 2.0 |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- API keys for [Anthropic](https://console.anthropic.com/), [ElevenLabs](https://elevenlabs.io/), and [Twitter Developer](https://developer.twitter.com/)
- An app registered at [developer.worldcoin.org](https://developer.worldcoin.org)

### 1. Clone and install

```bash
git clone https://github.com/your-org/world-substrate.git
cd world-substrate

# Frontend
npm install

# Backend
cd backend
uv sync
cd ..
```

### 2. Configure environment

**Frontend** — create `.env.local`:

```bash
AUTH_SECRET=           # Generate with: npx auth secret
AUTH_URL=              # Your app URL (ngrok URL for local dev)
NEXT_PUBLIC_APP_ID=    # From developer.worldcoin.org
NEXT_PUBLIC_SUBSTRATE_API_URL=http://localhost:8000
```

**Backend** — create `backend/.env` (see `backend/.env.example`):

```bash
DATABASE_URL=postgresql://localhost/substrate  # or sqlite:///substrate.db
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=http://localhost:3000/oauth/callback
TOKEN_ENCRYPTION_KEY=  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
APP_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000"]
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
npm run dev
```

Or use Docker to run everything (PostgreSQL + backend + frontend):

```bash
docker compose up
```

### 4. Connect to World App (local dev)

1. Start an [ngrok](https://ngrok.com/) tunnel: `ngrok http 3000`
2. Set `AUTH_URL` in `.env.local` to the ngrok URL
3. Update your app URL at [developer.worldcoin.org](https://developer.worldcoin.org)

## Project Structure

```
src/                          # Next.js frontend
  app/                        # App router pages
    (protected)/              # Authenticated routes (home, create, registry, chat)
  components/                 # React components
    Create/                   #   Multi-step substrate creation
    Substrate/                #   Substrate cards and profiles
    Knowledge/                #   Knowledge management + voice recorder
  lib/
    substrate-api.ts          # REST client for the backend
  auth/                       # Wallet auth + next-auth config
  providers/                  # Provider stack (MiniKit, session, Eruda)

backend/                      # FastAPI backend
  main.py                     # App entrypoint, CORS, routers
  api/                        # Route handlers
    substrates.py             #   Substrate CRUD + extraction
    agent.py                  #   ElevenLabs signed URL
    knowledge.py              #   Knowledge base management
    voice.py                  #   Voice upload + clone status
    oauth.py                  #   Twitter OAuth flow
  services/                   # Business logic
    agent_service.py          #   ElevenLabs agent management
    voice_service.py          #   Voice cloning
  agents/
    extraction_agent.py       # Claude personality extraction
  fetchers/
    twitter.py                # Tweet fetching
  models/                     # SQLAlchemy models
```

## License

MIT
