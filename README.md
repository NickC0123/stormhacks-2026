# stormhacks-2026

A social expense, planning and memories app. Create plans with friends, scan receipts, split individual items, track who owes whom, see your spending by category, and keep photos and notes from each event on a shared timeline.

## Tech stack

| Area | Choice |
| --- | --- |
| Mobile | React Native + Expo (TypeScript), Expo Router |
| Backend | Python, FastAPI, Pydantic |
| Database / Auth / Storage | Supabase (Postgres, Auth, Storage) |
| Receipt parsing | Gemini vision API |
| Local dev | Docker Compose (API) + Supabase CLI (database stack) |

## Repository layout

```
.
├── apps/
│   ├── mobile/                  Expo app
│   │   ├── app.json
│   │   ├── assets/
│   │   └── src/
│   │       ├── app/             Expo Router routes (every file is a screen)
│   │       │   ├── (auth)/      sign-in, sign-up
│   │       │   ├── (tabs)/      plans, timeline, balances, dashboard, profile
│   │       │   └── events/      new plan, event detail, memories, receipt scan + item splitting
│   │       ├── components/      ui/, events/, receipts/, memories/, dashboard/
│   │       ├── hooks/
│   │       ├── lib/             supabase client, API client, env
│   │       ├── constants/
│   │       └── types/           domain types (mirror the API schemas)
│   └── api/                     FastAPI service
│       ├── app/
│       │   ├── main.py
│       │   ├── core/            settings, Supabase JWT auth dependency
│       │   ├── db/              Supabase client
│       │   ├── api/v1/routes/   health, events, receipts, balances, memories, dashboard
│       │   ├── schemas/         Pydantic models
│       │   └── services/        Gemini receipt parser, storage, balance simplification
│       ├── tests/
│       ├── Dockerfile
│       └── requirements*.txt
├── supabase/
│   ├── config.toml              local Supabase stack (incl. receipts/memories buckets)
│   ├── migrations/              SQL migrations
│   └── seed.sql
├── dev                          `./dev up` / `./dev down`
└── docker-compose.yml
```

## Getting started

Prerequisites: Node 20+, Docker, the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and Expo Go or a simulator.

1. **Backend (Supabase + API)** — one command from the repo root:
   ```sh
   ./dev up      # supabase start + docker compose up --build -d
   ./dev down    # docker compose down + supabase stop
   ```
   The first `./dev up` creates `apps/api/.env` from the example. Fill in `SUPABASE_SERVICE_ROLE_KEY` (from `supabase status`) and `GEMINI_API_KEY`, then run it again. API docs at http://localhost:8000/docs.
   To apply migrations and seed data: `supabase db reset`.
2. **Mobile**:
   ```sh
   cd apps/mobile
   cp .env.example .env.local               # fill in the anon key
   npm install
   npx expo start
   ```
   On a physical device, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SUPABASE_URL` to your machine's LAN IP.

## Checks

```sh
# mobile
cd apps/mobile && npm run typecheck

# api (in a venv: pip install -r requirements-dev.txt)
cd apps/api && ruff check . && pytest
```

Add packages to the mobile app with `npx expo install <pkg>` so versions match the Expo SDK.
