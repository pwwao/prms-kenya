# PRMS — Full System Setup Guide

The system has three deployable parts, set up in this order because each
depends on the one before it:

1. **Backend API** (`prms-backend`) — Node/Express/MySQL/Redis. Everything else talks to this.
2. **Web Admin** (`prms-web-admin`) — React app for System Admin / Hospital Admin.
3. **Mobile App** (`prms-mobile`) — React Native app for Clinicians / Receptionists.

You already have the fixed backend (`prms-backend-final.tar.gz`). The web
admin and mobile app were audited but not modified — use the originals you
uploaded.

---

## Part 1 — Backend API

### 1.1 Prerequisites

- Node.js 20.x
- Docker + Docker Compose (for MySQL/Redis locally — or use real instances)
- OpenSSL (for key generation, usually pre-installed on Mac/Linux)

### 1.2 Install

You're already inside the full system archive — `prms-backend/`,
`prms-web-admin/`, and `prms-mobile/` are sibling folders here.

```bash
cd prms-backend
npm install
```

### 1.3 Start MySQL and Redis

```bash
docker-compose up -d mysql redis
```

This starts MySQL on `3306` and Redis on `6379` with dev credentials
already baked into `docker-compose.yml` (`prms_user` / `prms_dev_password`,
Redis password `prms_redis_dev`).

**Important gotcha:** `docker-compose.yml` also mounts
`./src/database/migrations` into MySQL's `docker-entrypoint-initdb.d/`,
which makes MySQL auto-run all 16 migration files itself on first
container start — but it does this *without* going through `migrate.ts`,
so the `migration_history` table never gets its rows recorded. If you then
run `npm run migrate` afterward, it will see an empty `migration_history`
and try to re-run everything, which will fail with "table already exists"
errors.

**Pick one of these two paths, don't mix them:**

- **Path A (recommended):** Before first start, remove or comment out this
  line in `docker-compose.yml`:
  ```yaml
  - ./src/database/migrations:/docker-entrypoint-initdb.d:ro
  ```
  Then let `npm run migrate` (step 1.6) be the only thing that ever applies
  migrations. This keeps `migration_history` accurate.

- **Path B:** Leave the mount as-is, let MySQL auto-apply migrations on
  first start, and *skip* `npm run migrate` entirely for a fresh database.
  Only use `npm run migrate` later when you add a *new* migration file
  after this initial setup — at that point manually insert rows for
  migrations 000–015 into `migration_history` first, or it will try to
  redo them.

Path A is simpler and is what the rest of this guide assumes.

**If you'd rather not use `migrate.ts` at all:** the original, complete
schema as one file is included at
`src/database/PRMS_Database_Complete.sql` — same content as the 16 split
migration files, just not broken apart. You can hand this to a DBA or run
it directly with `mysql -u prms_user -p prms_db < src/database/PRMS_Database_Complete.sql`
against a fresh database instead of `npm run migrate`. Don't run both
against the same database — pick one path.

### 1.4 Generate secrets

```bash
chmod +x scripts/*.sh
./scripts/generate-keys.sh
```

This creates `keys/jwt.private.key` and `keys/jwt.public.key` (RS256
keypair) and prints two more values to your terminal:

```
DATABASE_ENCRYPTION_KEY=<64-char hex>
HASH_SALT=<64-char hex>
```

Copy those two lines down — you'll paste them into `.env` next.

### 1.5 Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- Paste in `DATABASE_ENCRYPTION_KEY` and `HASH_SALT` from step 1.4
- `DB_PASSWORD=prms_dev_password` and `REDIS_PASSWORD=prms_redis_dev`
  (matching `docker-compose.yml`'s dev values)
- Leave `FCM_*`, `AFRICASTALKING_*`, `SMTP_*` as placeholders for now —
  the app will start fine without them; you only need real values when you
  actually want push notifications, SMS, or email to send (see Part 4)
- `CORS_ALLOWED_ORIGINS` already includes `http://localhost:5173` (the web
  admin's dev port) by default

### 1.6 Run migrations and seed data

**Before this step, confirm `.env` actually exists** (not just
`.env.example`) and is in `prms-backend/` itself, not a parent folder:

```bash
ls .env
```

If this errors with "No such file," go back to step 1.5 — `cp .env.example .env`
has to happen before this step, every time, on every machine you set this
up on. Skipping it is the single most common way to hit:

```
Error: [Config] Environment validation failed. Missing or invalid variables:
  API_BASE_URL: Required
  DB_HOST: Required
  ...
```

(Every variable shows as missing, not just one or two — that's the
signature of `.env` not being found at all, not of any individual value
being wrong.)

```bash
npm run migrate
npm run seed
```

`migrate` applies all 16 migration files in order and creates every table,
trigger, stored procedure, and view. `seed` then creates:

- 1 System Admin (`username: admin`)
- 2 approved hospitals (Kenyatta National Hospital, Nakuru County Referral Hospital)
- 1 Hospital Admin + 1 Clinician + 1 Receptionist per hospital

All seeded accounts share the password `ChangeMe123!` — the seed script
prints this reminder when it finishes. Usernames follow the pattern
`hadmin.h1`, `clinician.h1`, `receptionist.h1` (and `.h2` for the second
hospital) — check the seed script's console output for exact usernames if
you forget the pattern.

### 1.7 Start the API

```bash
npm run dev
```

This runs on **port 3000**. Confirm it's up:

```bash
curl http://localhost:3000/health
```

Try logging in as the seeded admin:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"ChangeMe123!"}'
```

You should get back an `accessToken`, `refreshToken`, and `user` object.

### 1.8 Run the test suite (optional but recommended)

```bash
npm test
```

This runs the full Vitest suite — unit tests (state machine, RBAC matrix,
auth service) plus integration tests (these need the database from step
1.3 running). 80% coverage threshold is configured; don't worry if it's
not hit on first run, that's a target for ongoing development, not a
blocker for getting the system running.

---

## Part 2 — Web Admin

### 2.1 Prerequisites

- Node.js 20.x (same machine as backend, or a separate one — just needs
  network access to wherever the backend ends up running)

### 2.2 Install and configure

```bash
cd prms-web-admin
npm install
cp .env.example .env
```

`.env` only needs two values, and the defaults already point at your local
backend:

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

If your backend is running somewhere other than `localhost:3000`, update
these accordingly.

*(Note: `vite.config.ts` also defines a dev proxy from `/api/v1` to
`localhost:3000`, but `api-client.ts` calls `VITE_API_BASE_URL` directly
rather than relative paths, so the proxy is present but currently unused —
not a problem, just worth knowing it's there if you ever switch to
relative API calls.)*

### 2.3 Start it

```bash
npm run dev
```

Vite's default dev port is **5173** — open `http://localhost:5173`. This
matches what's already in the backend's `CORS_ALLOWED_ORIGINS`, so requests
won't be blocked.

Log in with one of the seeded accounts — System Admin (`admin` /
`ChangeMe123!`) gets you the full admin view: hospital approvals, user
management, reports, audit logs. A Hospital Admin account (`hadmin.h1`)
gets the scoped, single-facility view.

### 2.4 Production build

```bash
npm run build
```

Outputs static files to `dist/` — deploy these behind any static host or
the Nginx config already included in the backend package
(`prms-backend/nginx/`).

---

## Part 3 — Mobile App

### 3.1 Prerequisites

This is the heaviest setup of the three:

- Node.js 20.x
- React Native development environment set up for whichever platform
  you're targeting first:
  - **iOS:** macOS, Xcode, CocoaPods (`sudo gem install cocoapods`)
  - **Android:** Android Studio, an Android SDK, a configured emulator or
    physical device with USB debugging on
- A Firebase project (for push notifications) — can be deferred, see 3.4

If you just want to see the app running without dealing with native
toolchains yet, Expo Go isn't an option here since this is a bare React
Native project (not Expo) — you do need the native build step at least
once.

### 3.2 Install

```bash
cd prms-mobile
npm install
```

**iOS only**, also run:
```bash
cd ios && pod install && cd ..
```

### 3.3 Configure environment

```bash
cp .env.example .env
```

```
API_BASE_URL=http://localhost:3000/api/v1
WS_URL=ws://localhost:3000
```

**Important:** if you're running the app on a physical device (not a
simulator/emulator), `localhost` won't reach your dev machine. Replace it
with your machine's LAN IP (e.g. `http://192.168.1.42:3000/api/v1`), and
make sure your backend's `CORS_ALLOWED_ORIGINS` and firewall allow that.
Android emulators specifically use `10.0.2.2` to reach the host machine's
`localhost` — use `http://10.0.2.2:3000/api/v1` there instead.

### 3.4 Firebase (optional for first run)

Leave `FIREBASE_PROJECT_ID` etc. blank to get the app running without push
notifications. To enable them later: create a Firebase project, download
`google-services.json` (Android) into `android/app/`, and
`GoogleService-Info.plist` (iOS) into `ios/`, then fill in the three
Firebase env vars.

### 3.5 Run it

```bash
# Terminal 1 — Metro bundler
npm start

# Terminal 2 — launch on a platform
npm run ios       # or
npm run android
```

Log in with one of the seeded Clinician or Receptionist accounts —
mobile's UI is built for those two roles specifically (Hospital Admin and
System Admin use the web portal instead).

### 3.6 Offline sync

Mobile's WatermelonDB sync hits `POST /api/v1/sync` on the backend. This
endpoint only works for hospital staff accounts (`hospitalId` not null) —
trying to sync as the System Admin account will correctly fail with a 403,
since System Admin doesn't have a hospital and isn't meant to use the
mobile app.

---

## Part 4 — Wiring up real external services (when you're ready)

These aren't needed to get the system running end-to-end with the seeded
accounts, but you'll want them before going live:

| Service | What it's for | Where to configure |
|---|---|---|
| **Firebase Cloud Messaging** | Push notifications to mobile | `FCM_*` in backend `.env`, plus mobile's `google-services.json`/`GoogleService-Info.plist` |
| **Africa's Talking** | SMS — referral alerts, SMS-based 2FA codes | `AFRICASTALKING_*` in backend `.env` |
| **SMTP (e.g. AWS SES)** | Email — password reset links, notifications | `SMTP_*` in backend `.env` |

Without these configured, the relevant features (push, SMS, email) will
fail gracefully with logged errors rather than crash the app — but SMS-based
2FA specifically won't work until `AFRICASTALKING_*` is real, since that's
how the one-time codes actually get delivered.

---

## Quick-reference: what's running where

| Component | Port | Started by |
|---|---|---|
| MySQL | 3306 | `docker-compose up -d mysql` |
| Redis | 6379 | `docker-compose up -d redis` |
| Backend API | 3000 | `npm run dev` in `prms-backend/` |
| Web Admin | 5173 | `npm run dev` in `prms-web-admin/` |
| Mobile (Metro bundler) | 8081 | `npm start` in `prms-mobile/` |

## Quick-reference: seeded login accounts

| Role | Username | Password | Hospital |
|---|---|---|---|
| System Admin | `admin` | `ChangeMe123!` | none (web admin only) |
| Hospital Admin | `hadmin.h1` | `ChangeMe123!` | Kenyatta National Hospital |
| Clinician | `clinician.h1` | `ChangeMe123!` | Kenyatta National Hospital |
| Receptionist | `receptionist.h1` | `ChangeMe123!` | Kenyatta National Hospital |
| Hospital Admin | `hadmin.h2` | `ChangeMe123!` | Nakuru County Referral Hospital |
| Clinician | `clinician.h2` | `ChangeMe123!` | Nakuru County Referral Hospital |
| Receptionist | `receptionist.h2` | `ChangeMe123!` | Nakuru County Referral Hospital |

Change all of these before any production deployment — they're seed data
meant for getting the system running locally, not real accounts.

---

## Troubleshooting

**`Environment validation failed` listing every variable as missing**
`.env` doesn't exist yet, or you're running the command from the wrong
folder. Run `cp .env.example .env` inside `prms-backend/` (step 1.5), and
make sure you're `cd`'d into `prms-backend/` itself before running
`npm run migrate`, `npm run seed`, or `npm run dev` — not the parent
folder, not `prms-web-admin/`.

**`ECONNREFUSED` connecting to MySQL or Redis**
They're not running, or `.env`'s `DB_HOST`/`REDIS_HOST` don't match where
they actually are. If you used `docker-compose up -d mysql redis`, confirm
both containers are actually up: `docker ps`. `DB_HOST`/`REDIS_HOST`
should be `localhost` when running the backend directly on your machine
against Dockerized MySQL/Redis (not `mysql`/`redis` — those hostnames only
resolve from *inside* the Docker network, i.e. if the backend itself were
also containerized, which it isn't in this dev setup).

**"table already exists" during `npm run migrate`**
You've run both the Docker auto-init mount *and* `migrate.ts` against the
same database, or run `migrate.ts` twice against a database that was
already fully migrated outside of it (e.g. via the standalone
`PRMS_Database_Complete.sql` route in 1.3). Drop the database and start
over with exactly one of the three paths in step 1.3, not a mix.

**CORS errors in the browser console when using the web admin**
Check `CORS_ALLOWED_ORIGINS` in the backend's `.env` includes
`http://localhost:5173` (it does by default) and that you haven't changed
the web admin's dev port without updating this.

**Mobile app can't reach the backend, but curl from your computer works fine**
You're on a physical device or Android emulator and still have
`API_BASE_URL=http://localhost:3000/...` in mobile's `.env` — see step 3.3
for the LAN-IP / `10.0.2.2` fix.
