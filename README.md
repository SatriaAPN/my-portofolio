# Satria Nusa — Portfolio + Admin CMS

A personal portfolio site with an admin CMS and two AI-assisted features, built
from the `design_handoff_portfolio_cms` design handoff.

- **Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- **Backend** — Go · SQLite · chi router · JWT cookie auth · bcrypt
- **AI** — pluggable `ai.Provider`: real **Claude API** (`ai.ClaudeProvider`,
  Anthropic Go SDK) when `ANTHROPIC_API_KEY` is set, else a keyword stub that
  needs no key. Any API failure falls back to the stub automatically.

```
my-portofolio/
├── backend/    Go API (REST + auth + AI), SQLite store, seed data
└── frontend/   Next.js app (public site + admin CMS)
```

## Prerequisites

- Go ≥ 1.23
- Node ≥ 18.18 (this repo was built with v21.6.1 via nvm)

## Run it

Two terminals.

**1. Backend** (`http://localhost:8080`)

```bash
cd backend
cp .env.example .env   # optional — sensible defaults otherwise
go run .
```

On first run it creates `portfolio.db`, applies the schema, and seeds posts,
projects, site content, one tailored-CV record, and an admin user.

**2. Frontend** (`http://localhost:3000`)

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api/*` to the Go backend (see `next.config.ts`), so the
browser makes same-origin calls and the auth cookie is first-party.

## Admin login

Open `http://localhost:3000/admin`. Default seeded credentials (override with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` before first run):

```
admin@satrianusa.dev / admin1234
```

## What's real vs. simulated

Per the handoff, the design is final and these parts are the ones to swap for
real implementations:

| Feature | Now | Swap for |
| --- | --- | --- |
| Ask AI chat | Claude API grounded in live site data (stub without a key) | — done |
| Tailored CV | deterministic scoring + Claude-written tailored summary (stub without a key) | — done |
| Analytics / Messages / Chat logs | hardcoded demo data | real sources |
| Persistence | SQLite (dataURL images inline) | Postgres + object storage |
| Auth | bcrypt + JWT cookie (real) | add refresh/roles as needed |

To enable real Claude answers: add `ANTHROPIC_API_KEY=sk-ant-...` to
`backend/.env` (optionally `AI_MODEL=claude-haiku-4-5` for a cheaper/faster model
— default is `claude-opus-5`) and restart the backend. Without a key it runs the
keyword stub, and any API error falls back to the stub automatically.

## Routes

**Public** — `/` (portfolio), `/blog`, `/blog/[slug]`, `/projects`, `/ask-ai`
**Admin** — `/admin/login`, `/admin` (dashboard), `/admin/editor`, `/admin/cv`

## API (Go)

Public: `GET /api/site`, `GET /api/posts`, `GET /api/posts/{slug}`,
`GET /api/projects`, `GET /api/ai/common-questions`, `POST /api/ai/ask`.
Auth: `POST /api/auth/login|logout`, `GET /api/auth/me`.
Admin (cookie-protected, under `/api/admin`): posts/projects/site/cv CRUD,
`POST /cv/generate`, plus `overview`/`analytics`/`messages`/`chatlogs`.
