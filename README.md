# stormhacks-2026

A social expense, planning and memories app. Create plans with friends, scan receipts, split individual items, track who owes whom, see your spending by category, and keep photos and notes from each event on a shared timeline.

## Tech stack

| Area | Choice |
| --- | --- |
| Mobile | React Native + Expo (TypeScript), Expo Router |
| Backend | Python, FastAPI, Pydantic |
| Database / Auth / Storage | Supabase (Postgres, Auth, Storage) |
| Receipt parsing | Gemini vision API |
| Local dev | `./dev up` / `./dev down` (hosted Supabase, local API and Expo) |

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

### First run for teammates

Open Docker Desktop and wait for it to be running, then:

```sh
git clone https://github.com/NickC0123/stormhacks-2026.git
cd stormhacks-2026
./dev up
```

If you already cloned the repo, run `git pull` before `./dev up`. On Windows, use Git Bash or WSL for the `dev` script.

The script connects to the hosted Supabase project configured in `apps/mobile/.env.cloud` and `apps/api/.env.cloud`, starts the FastAPI Docker container, installs mobile dependencies when needed, and starts Expo in the background. Configure these ignored cloud env files as described in SETUP.md before running it. The first run downloads Docker images and can take several minutes.

### Open the app

Once Expo is ready, `./dev up` prints an **Expo Go QR code** in the terminal. Keep your phone and computer on the same Wi-Fi, then scan with Expo Go on Android or the Camera app on iOS. Each teammate's QR code points to their own computer.

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.cloud` to your computer's LAN IP on port 8000, then rerun `./dev up` if your network address changes. For optional local mode, override the detected address with `DEV_HOST=192.168.1.20 ./dev up local`.

API docs are at [http://localhost:8000/docs](http://localhost:8000/docs). The health endpoint at [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) returns `{"status":"ok"}`. Expo output is saved in `.dev/expo.log`; Supabase startup output is in `.dev/supabase-start.log`.

The app currently has placeholder screens, and most feature API endpoints return `501 Not Implemented`. The default startup uses hosted Supabase; inspect data in the project’s online Supabase dashboard.

### Stop and configure

```sh
./dev down  # stops Expo and FastAPI
```

Add `GEMINI_API_KEY` to `apps/api/.env.cloud` when you need receipt scanning, then rerun `./dev up`. Keep env files and local keys out of Git. Apply migrations to the hosted project before using it. For an optional local database, run `./dev up local` and stop it with `./dev down local`.

## Checks

```sh
# mobile
cd apps/mobile && npm run lint && npm run typecheck

# api (in a venv: pip install -r requirements-dev.txt)
cd apps/api && ruff check . && pytest
```

Add packages to the mobile app with `npx expo install <pkg>` so versions match the Expo SDK.
