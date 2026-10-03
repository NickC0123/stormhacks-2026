# Setup guide

Run Supabase (database, auth, storage), the FastAPI backend, and the Expo mobile app with one command.

Estimated time: 15–20 minutes (the first Docker pull is the slow part).

## 1. Install the prerequisites

| Tool | Version | Check with | Install |
| --- | --- | --- | --- |
| Git | any | `git --version` | https://git-scm.com |
| Node.js | 22.13+ or 24.3+ (LTS) | `node -v` | https://nodejs.org |
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

## 3. Start everything

```sh
./dev up
```

The first run downloads Docker images and installs mobile packages, so it may take a few minutes. The script reads local Supabase keys, creates ignored env files, builds the API container, and starts Expo in the background. It starts the Supabase services used by the app (database, auth, storage, REST) and skips optional analytics, Studio, and edge services to save resources. Database migrations apply on the first Supabase start. To reset the database and apply the seed again, run `supabase db reset` (or `npx supabase db reset` if the CLI is not installed).

For receipt scanning, add your Gemini key to `GEMINI_API_KEY` in `apps/api/.env`, then run `./dev up` again. Other features do not need it.

## 4. Check the app

Open http://localhost:8000/docs in a browser. You should see the interactive API docs.

Or from a terminal:

```sh
curl http://localhost:8000/api/v1/health
# {"status":"ok"}
```

Most other endpoints currently return `501 Not Implemented`. That is expected until they are built. The script prints an `exp://` URL for Expo Go. Expo startup output is in `.dev/expo.log`.

### Using a physical phone

The script writes your computer's detected LAN IP into mobile env vars. Make sure the phone and computer are on the same Wi-Fi. If it picks the wrong interface, run `DEV_HOST=192.168.1.20 ./dev up` with your LAN IP.

Find your LAN IP with `ipconfig getifaddr en0` (macOS), `hostname -I` (Linux), or `ipconfig` (Windows).

## 5. Stop everything

```sh
./dev down
```

This stops Expo, the API container, and the Supabase stack. Your data is kept for next time. To wipe it, run `supabase db reset`.

## Everyday commands

| Task | Command |
| --- | --- |
| Start everything | `./dev up` |
| Stop everything | `./dev down` |
| Follow API logs | `docker compose logs -f api` |
| Reset the database | `supabase db reset` |
| Show Supabase URLs and keys | `supabase status` |
| Follow Expo logs | `tail -f .dev/expo.log` |
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
Set `DEV_HOST` to your computer's LAN IP (see step 4) and run `./dev up` again.

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
