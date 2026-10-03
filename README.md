# stormhacks-2026

A social expense, planning and memories app. Create plans with friends, scan receipts, split individual items, track who owes whom, see your spending by category, and keep photos and notes from each event on a shared timeline.

## Tech stack

| Area | Choice |
| --- | --- |
| Mobile | React Native + Expo (TypeScript), Expo Router |
| Backend | Python, FastAPI, Pydantic |
| Database / Auth / Storage | Supabase (Postgres, Auth, Storage) |
| Receipt parsing | Gemini vision API |
| Local dev | `./dev up` / `./dev down` (Supabase, API, Expo) |

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
├── dev                          start/stop Supabase, API, and Expo
├── SETUP.md                     step-by-step setup guide
└── docker-compose.yml
```

## Getting started

> New to the repo? Follow the step-by-step guide in [SETUP.md](SETUP.md). The summary below is the short version.

Prerequisites: Node 22.13+ or 24.3+ (LTS), Docker, and Expo Go or a simulator. The [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) is optional; the script uses `npx supabase` when it is not installed.

1. **Start everything** — one command from the repo root:
   ```sh
   ./dev up      # starts Supabase, FastAPI, and Expo
   ./dev down    # stops all three
   ```
   The script installs mobile dependencies on first run, writes local Supabase keys into ignored env files, and uses your LAN IP for phone access. Set `DEV_HOST=<your LAN IP>` if it detects the wrong interface. API docs are at http://localhost:8000/docs; Expo logs are in `.dev/expo.log`. Add `GEMINI_API_KEY` to `apps/api/.env` only when you need receipt scanning. Migrations run during the initial Supabase start; `supabase db reset` reapplies them and seed data.

## Checks

```sh
# mobile
cd apps/mobile && npm run typecheck

# api (in a venv: pip install -r requirements-dev.txt)
cd apps/api && ruff check . && pytest
```

Add packages to the mobile app with `npx expo install <pkg>` so versions match the Expo SDK.
