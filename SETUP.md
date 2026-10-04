# Setup guide

Connect the FastAPI backend and Expo mobile app to hosted Supabase with one command.

Estimated time: 15–20 minutes (the first Docker pull is the slow part).

## 1. Install the prerequisites

| Tool | Version | Check with | Install |
| --- | --- | --- | --- |
| Git | any | `git --version` | https://git-scm.com |
| Node.js | 22.13+ or 24.3+ (LTS) | `node -v` | https://nodejs.org |
| Docker Desktop | any recent | `docker --version` | https://www.docker.com/products/docker-desktop |
| Expo Go (phone) or a simulator | latest | — | App Store / Google Play, or Xcode / Android Studio |

Notes:
- **Docker must be running** (open Docker Desktop and wait until it says it is running).
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

The default command connects to hosted Supabase using `apps/mobile/.env.cloud` and `apps/api/.env.cloud`. Configure these ignored files as described below before the first run. It builds the local API container, installs mobile dependencies when needed, and starts Expo in the background.

For receipt scanning, add `GEMINI_API_KEY` to `apps/api/.env.cloud`, then run `./dev up` again.

## 4. Check the app

Open http://localhost:8000/docs in a browser. You should see the interactive API docs.

Or from a terminal:

```sh
curl http://localhost:8000/api/v1/health
# {"status":"ok"}
```

Most other endpoints currently return `501 Not Implemented`. That is expected until they are built. The script prints a QR code and an `exp://` URL for Expo Go after the mobile server is ready. Scan it with Expo Go on Android or the Camera app on iOS. Expo startup output is in `.dev/expo.log`.

The app opens on Supabase email/password sign-in. Choose **Create an account** for a new user in the hosted project; email confirmation follows the project’s Auth settings. Sessions persist on the device, and **Profile → Sign out** ends the session. The Events tab can create an event for the signed-in user. Accounts and events created with `./dev up` live in the hosted Supabase project. View accounts under **Authentication → Users** and app data under **Table Editor** in the online dashboard.

### Hosted Supabase project

Put the project URL and publishable key in the ignored `apps/mobile/.env.cloud` file, and the matching project URL and legacy `service_role` key in the ignored `apps/api/.env.cloud` file. The current Python client expects the JWT-formatted service-role key; find it under the project's legacy API keys. Set `EXPO_PUBLIC_API_URL` in the mobile file to your computer's LAN address on port 8000. The service-role key belongs only in the API file, never in the mobile app or Git. Apply the migrations in `supabase/migrations/` to the hosted database before creating events. Run `./dev up` to start Expo and the API, and `./dev down` to stop them.

### Expenses

Apply `supabase/migrations/20261004000001_expenses.sql` in the hosted SQL editor once.
It creates the `expenses` table and private `receipts` storage bucket.

Open **Expenses → New expense** to enter details manually or choose a receipt photo.
**Scan and fill expense** uses the existing parser to populate editable fields;
**Save expense** stores the fields and attaches the selected photo. Open a saved
expense to attach a receipt later. Events are optional. Splitting is not included yet.

The authenticated API provides `GET/POST /api/v1/expenses`,
`GET/PUT /api/v1/expenses/{id}`, and `POST/GET /api/v1/expenses/{id}/receipt`.
Expense date and optional time are local calendar values; scans with only a date
leave time empty. Item amounts and the overall amount are independent, and parser
warnings and original JSON are retained for review.

### Event invites

Apply `supabase/migrations/20261004000002_event_invites.sql` in the hosted SQL editor once.

Open an event and choose **Invite friends** to invite accepted friends. Any member can
invite their own friends. Invites appear under **Invitations** on the Events tab, where
the friend can join or decline; members can cancel pending invites from the event page.

The authenticated API provides `GET /api/v1/events/{id}` (members and pending invites),
`POST /api/v1/events/{id}/invites`, `GET /api/v1/invites`,
`POST /api/v1/invites/{id}/accept`, and `DELETE /api/v1/invites/{id}`.

### Using a physical phone

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.cloud` to your computer’s LAN IP on port 8000. Make sure the phone and computer are on the same Wi-Fi. Update that URL when your LAN IP changes.

Find your LAN IP with `ipconfig getifaddr en0` (macOS), `hostname -I` (Linux), or `ipconfig` (Windows).

## 5. Stop everything

```sh
./dev down
```

This stops Expo and the API container. Hosted Supabase keeps running and retains your data.

## Everyday commands

| Task | Command |
| --- | --- |
| Start everything | `./dev up` |
| Stop everything | `./dev down` |
| Follow API logs | `docker compose logs -f api` |
| Follow Expo logs | `tail -f .dev/expo.log` |
| Typecheck mobile | `cd apps/mobile && npm run typecheck` |
| Lint + test API | `cd apps/api && ruff check . && pytest` |
| Add a mobile package | `cd apps/mobile && npx expo install <package>` |

The API reloads automatically when you edit files in `apps/api`. The mobile app reloads automatically too.

## Troubleshooting

**`Cannot connect to the Docker daemon`**
Docker Desktop is not running. Start it and retry.

**Port already in use (8000 or 8081)**
Another process is using the port. Stop it, or run `./dev down` to clear leftover containers from a previous run.

**API returns 401 or crashes on startup**
`SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env.cloud` is missing or wrong. Copy the hosted project’s legacy service_role key and run `./dev up` again.

**Mobile app cannot reach the API or Supabase on a phone**
Update `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.cloud` to your computer’s LAN IP on port 8000 and run `./dev up` again.

**Mobile app shows old environment values**
Expo caches env vars. Stop it and run `npx expo start --clear`.

**`./dev: Permission denied`**
Run `chmod +x dev`.

**`./dev` does nothing on Windows**
Use Git Bash or WSL, not PowerShell or cmd.

**Receipt scanning fails**
Check that `GEMINI_API_KEY` is set in `apps/api/.env.cloud` and that you restarted the API after adding it.

## Project layout

See the "Repository layout" section of [README.md](README.md).
