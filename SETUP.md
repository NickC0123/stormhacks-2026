# Setup guide

Follow these steps in order to run the whole app locally: Supabase (database, auth, storage), the FastAPI backend, and the Expo mobile app.

Estimated time: 15–20 minutes (the first Docker pull is the slow part).

## 1. Install the prerequisites

| Tool | Version | Check with | Install |
| --- | --- | --- | --- |
| Git | any | `git --version` | https://git-scm.com |
| Node.js | 20+ | `node -v` | https://nodejs.org |
| Docker Desktop | any recent | `docker --version` | https://www.docker.com/products/docker-desktop |
| Supabase CLI | any recent | `supabase --version` | https://supabase.com/docs/guides/local-development/cli/getting-started |
| Expo Go (phone) or a simulator | latest | — | App Store / Google Play, or Xcode / Android Studio |

Notes:
- **Docker must be running** (open Docker Desktop and wait until it says it is running).
- If you skip the Supabase CLI install, `./dev` falls back to `npx supabase`, which works but is slower.
- **Windows:** use Git Bash or WSL for all commands below. `./dev` is a bash script and will not run in PowerShell or cmd.
- A **Gemini API key** is only needed for receipt scanning. Get one at https://aistudio.google.com/apikey.

## 2. Clone the repo

```sh
git clone https://github.com/NickC0123/stormhacks-2026.git
cd stormhacks-2026
chmod +x dev        # only needed if ./dev is not already executable
```

All commands below run from the repo root unless a step says otherwise.

## 3. Start the backend (Supabase + API)

```sh
./dev up
```

The first run does two things:
1. Creates `apps/api/.env` from `apps/api/.env.example` and prints a reminder.
2. Starts Supabase (Postgres, Auth, Storage) and then the API container.

The first run downloads several Docker images and can take a few minutes. The API will not work yet because its `.env` has no keys. That is expected; continue to step 4.

## 4. Get your local Supabase keys

```sh
supabase status
```

Copy these values from the output:
- **API URL** (usually `http://127.0.0.1:54321`)
- **anon key** (newer CLI versions call it the *publishable key*)
- **service_role key** (newer CLI versions call it the *secret key*)

## 5. Configure the API

Open `apps/api/.env` and set:

```env
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key from step 4>
GEMINI_API_KEY=<your Gemini key>
```

Leave `SUPABASE_URL=http://host.docker.internal:54321` as it is. The API runs inside Docker and reaches Supabase through that hostname.

Then restart the API so it picks up the new values:

```sh
./dev up
```

## 6. Create the database tables

```sh
supabase db reset
```

This applies everything in `supabase/migrations/` and then `supabase/seed.sql`. Run it again any time you want a clean database.

## 7. Check that the API works

Open http://localhost:8000/docs in a browser. You should see the interactive API docs.

Or from a terminal:

```sh
curl http://localhost:8000/api/v1/health
# {"status":"ok"}
```

Most other endpoints currently return `501 Not Implemented`. That is expected until they are built.

## 8. Start the mobile app

In a new terminal:

```sh
cd apps/mobile
cp .env.example .env.local
```

Edit `apps/mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key from step 4>
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Install and start:

```sh
npm install
npx expo start
```

Then open the app:
- **iOS simulator:** press `i` in the terminal.
- **Android emulator:** press `a`.
- **Physical phone:** scan the QR code with Expo Go (iOS: Camera app, Android: Expo Go app).

### Using a physical phone

`localhost` on your phone is the phone itself, not your computer. Replace `127.0.0.1` and `localhost` in `.env.local` with your computer's LAN IP (for example `192.168.1.20`), and make sure the phone and computer are on the same Wi-Fi. Restart `npx expo start` after changing `.env.local`.

Find your LAN IP with `ipconfig getifaddr en0` (macOS), `hostname -I` (Linux), or `ipconfig` (Windows).

## 9. Stop everything

```sh
./dev down
```

This stops the API container and the Supabase stack. Your data is kept for next time. To wipe it, run `supabase db reset`.

## Everyday commands

| Task | Command |
| --- | --- |
| Start backend | `./dev up` |
| Stop backend | `./dev down` |
| Follow API logs | `docker compose logs -f api` |
| Reset the database | `supabase db reset` |
| Show Supabase URLs and keys | `supabase status` |
| Start mobile app | `cd apps/mobile && npx expo start` |
| Typecheck mobile | `cd apps/mobile && npm run typecheck` |
| Lint + test API | `cd apps/api && ruff check . && pytest` |
| Add a mobile package | `cd apps/mobile && npx expo install <package>` |

The API reloads automatically when you edit files in `apps/api`. The mobile app reloads automatically too.

## Troubleshooting

**`Cannot connect to the Docker daemon`**
Docker Desktop is not running. Start it and retry.

**Port already in use (8000, 54321, 54322, ...)**
Another process is using the port. Stop it, or run `./dev down` and `supabase stop` to clear leftover containers from a previous run.

**API returns 401 or crashes on startup**
`SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` is missing or wrong. Re-copy it from `supabase status` and run `./dev up` again.

**Mobile app cannot reach the API or Supabase on a phone**
You are still using `localhost` / `127.0.0.1`. Use your computer's LAN IP (see step 8) and restart Expo.

**Mobile app shows old environment values**
Expo caches env vars. Stop it and run `npx expo start --clear`.

**`./dev: Permission denied`**
Run `chmod +x dev`.

**`./dev` does nothing on Windows**
Use Git Bash or WSL, not PowerShell or cmd.

**Receipt scanning fails**
Check that `GEMINI_API_KEY` is set in `apps/api/.env` and that you restarted the API after adding it.

## Project layout

See the "Repository layout" section of [README.md](README.md).
