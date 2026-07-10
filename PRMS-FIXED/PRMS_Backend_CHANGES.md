# PRMS Backend — Integration & Implementation Changelog

This document summarizes every change made while merging and fixing the
Backend Platform, Core Business Modules, Communication, DevOps/QA, Mobile,
and Web Admin submissions into a single working backend, per
`PRMS_Integration_Report.md`.

---

## 1. Build-breaking bugs fixed

- **Removed two stray packaging-artifact directories** (`src/{config,middleware,shared...}`
  and `src/modules/{hospitals,users,patients,referrals}`) — broken `mkdir -p {a,b,c}`
  leftovers from the source packages, present in both the Backend Platform and
  Core Business Modules submissions.
- **`shared/base.repository.ts`** — fixed two broken relative imports
  (`../../config/...` → `../config/...`) and one more found during final
  verification (`../errors/...` → `./errors/...`, since `errors/` is a child
  of `shared/`, not a sibling).
- **`shared/base.service.ts`** — fixed two broken relative imports
  (`../../config/...` → `../config/...`).
- **`shared/queue/queue.ts`** — found during final verification pass: imports
  resolved to `shared/config/` (doesn't exist) instead of `src/config/`.
  Fixed `../config/` → `../../config/` (file is at depth 2, not depth 1).
- **`server.ts`** — added the missing `logger` import (used in 7 places,
  never imported).
- **9 test files had broken relative imports**, found via a full
  import-resolution scan of the merged repo (not caught by manual review):
  - `modules/{hospitals,patients,referrals,users}/*.test.ts` — same-directory
    sibling imports used one `../` too many (e.g. `'../hospitals.service.js'`
    instead of `'./hospitals.service.js'`), and `shared/` imports used
    `'../../../shared/'` instead of `'../../shared/'`.
  - `modules/chat/chat.test.ts` — same pattern, plus a `vi.mock('../../../config/...)`
    call site needed the same fix.
  - `modules/notifications/{notifications,notifications-queue,notifications-worker}.test.ts`
    — same pattern.
  - `modules/notifications/notifications-templates.test.ts` — opposite
    problem: used `'../templates/...'` when `templates/` is a sibling
    subdirectory, not a parent; fixed to `'./templates/...'`.
  - `modules/notifications/notifications-worker.test.ts` — same fix applied
    to `'../channels/...'` → `'./channels/...'`.
- **`referrals.routes.ts`** — `requirePermission('referral:transition')` did
  not typecheck against `TPermission` (no such permission string exists).
  Removed; fine-grained per-transition authorization is already enforced by
  `validateTransition()` in the state machine layer, so the coarse
  `authorize([...])` role gate plus that check is sufficient.
- **`src/database/migrate.ts`** — found and fixed a real bug independent of
  the original report: the original statement-splitting logic
  (`sql.split(/;\s*\n/)`) corrupts any migration file containing a
  `DELIMITER $$` block (triggers, stored procedures), since semicolons
  inside a trigger/procedure body aren't real statement terminators. Fixed
  by using a dedicated connection with `multipleStatements: true` (separate
  from the shared app pool, which correctly keeps this disabled) and
  stripping `DELIMITER` directives, letting MySQL parse compound statement
  bodies natively. Also fixed the bootstrap chicken-and-egg problem where
  `migration_history` needs to exist before its own creating migration can
  be checked for already having run.
- **`jsonwebtoken`, `firebase-admin`, `nodemailer`, `@types/nodemailer`,
  `@types/jsonwebtoken`** — added to `package.json`; were imported and used
  but never declared.
- **`shared/base.repository.ts` — `transaction()` and `softDelete()` were
  declared `protected`, but `hospitals.service.ts` and `users.service.ts`
  call them as `this.repo.transaction(...)` / `this.repo.softDelete(...)`
  from the *service* layer, outside the repository class.** A `protected`
  member is not accessible that way — this would be a TypeScript compile
  error. Found via a systematic cross-check of every service-to-repository
  method call against each repository's actually-defined methods, after a
  user hit an unrelated runtime error that prompted a deeper audit. Both
  methods are thin, safe wrappers (the doc comments' own example code even
  showed external-style usage), so there's no safety reason to keep them
  subclass-only — changed both to `public`. This bug predates this
  session, present in the original Core Business Modules submission;
  nothing in this session's own code depended on the broken visibility.
- **`shared/services/cache.service.ts` had no `CacheService` class at
  all** — only standalone functions (`getOrSet`, `invalidate`,
  `invalidatePattern`, `prime`). But every business module's
  service/routes file (hospitals, patients, referrals, users, and the
  auth module written in this session, which followed the same
  established pattern) does `new CacheService()` and calls
  `.get()`/`.set()`/`.del()` as instance methods. This is the single
  largest gap found in this pass — present in the *original* Core
  Business Modules submission from the very start, propagated into 5
  files total. Added a `CacheService` class to the same file, wrapping
  the existing functions to provide exactly the instance-method interface
  every consumer expects (`get<T>(key)`, `set(key, value, ttl)`,
  `del(...keys)`, plus `getOrSet`/`invalidatePattern` passthroughs). The
  original standalone functions are kept unchanged in case anything
  calls them directly.
- **`modules/sync/sync.routes.ts` imported `ReferralsRepository` and
  `PatientsRepository` (plural)** — the actual exported class names are
  singular (`ReferralRepository`, `PatientRepository`), matching the
  naming convention used by every other module
  (`HospitalRepository`, `UserRepository`). This was a naming mistake in
  the sync module written during this session. Fixed.
- **`dotenv` was used but never declared in `package.json` at all** — not
  by the original Backend Platform submission, and not initially caught in
  this session either. `server.ts` correctly calls `import 'dotenv/config'`
  as its first line, but since the package itself was never in
  `package.json`, a clean `npm install` wouldn't have it available. Added
  `dotenv` to dependencies.
- **`src/database/migrate.ts` and `src/database/seeds/run-seeds.ts` were
  missing the `import 'dotenv/config'` call entirely** — this was a bug
  introduced by the Integration Team while rewriting/authoring these two
  files in this session, not inherited from any submitted package.
  `server.ts` loads dotenv correctly as its first import; every other
  module that reads `env` is only ever reached through `server.ts`'s import
  chain so it inherits that load. `migrate.ts` and `run-seeds.ts` are
  standalone entry points run directly via `tsx`, never imported by
  `server.ts`, so they each needed their own explicit
  `import 'dotenv/config'` as the first line. Both fixed. (Both of these
  dotenv issues surfaced together when a user ran `npm run migrate` and
  got every single env var reported as missing — the signature of `.env`
  never being loaded into `process.env` at all, not of any individual
  value being wrong.)

## 2. Contract-deviation fixes (route paths, methods, field names)

All four business modules' route param names normalized from generic `:id`
to resource-specific names per Architecture Contract §7.3 and to match what
mobile and web already implemented: `:hospitalId`, `:patientId`,
`:referralId`, `:userId`. Updated in each module's `.routes.ts`,
`.controller.ts`, and `.validator.ts`.

- **Referral status transition** — was `POST /referrals/:id/transition`
  with body field `newStatus`; now `PATCH /referrals/:referralId/status`
  with body field `status`, matching the OpenAPI spec and what mobile
  already calls. Internal service-layer interface (`ITransitionStatusInput.newStatus`)
  was deliberately left unchanged — only the HTTP-facing controller/validator
  boundary changed.
- **`PATCH /hospitals/:hospitalId/status`** — added. The backend previously
  only had split `POST /approve`, `/suspend`, `/reactivate` endpoints; web
  admin calls a single unified status endpoint. Delegates internally to the
  existing approve/suspend/reactivate service methods based on the requested
  status. The split endpoints are kept for backward compatibility.
- **`PATCH /users/:userId/status`** — same pattern, added for users.
- **`POST /hospitals` Public-vs-authenticated discrepancy** — left
  unresolved with a clear inline comment rather than silently changed, since
  reversing access control on a registration endpoint is a real decision
  that needs explicit confirmation of the intended onboarding flow.

## 3. Auth module — built from scratch

No `auth` module existed in any submitted package. Built
`src/modules/auth/` (repository, service, controller, validator, routes)
implementing all 9 endpoints from the OpenAPI spec:

`POST /login`, `POST /verify-2fa`, `POST /refresh`, `POST /logout`,
`GET /me`, `POST /forgot-password`, `POST /reset-password`,
`PATCH /change-password`, `POST /register-device`.

Every request/response field name was verified against
`PRMS_OpenAPI_v1_0.yaml` and the web admin's `auth.types.ts` directly,
including:
- `identifier`/`password` for login (not `username`/`email`)
- `otpCode` for 2FA verification (not `otp`)
- `resetToken` for password reset (not `token`)
- `deliveryMethod: 'TOTP' | 'SMS'` (uppercase) in the 2FA-required response
- `AuthTokens` response shape with nested `user: UserSummary` including
  `hospitalName` (resolved via `HospitalRepository`) and `isFirstLogin`
  (derived from `last_login_at === null`)
- `minLength: 12` + required `confirmPassword` for both reset-password and
  change-password (stricter than the general 8-char `passwordSchema` used
  for account creation)

Implementation notes:
- `PATCH /change-password` delegates to the existing, already-tested
  `UserService.changePassword()` rather than duplicating that logic.
- `GET /me` does **not** reuse `UserService.getUserById()`, because that
  method applies role-based PII masking intended for viewing *other* users'
  profiles — applying it to a self-view would incorrectly mask a
  Receptionist's own name/email.
- SMS-based 2FA is fully implemented (OTP generated, stored in Redis with a
  5-minute TTL, sent via the existing `sendSms()` channel, single-use).
- **TOTP-based 2FA is a deliberate stub, not a fabricated implementation.**
  No TOTP library (e.g. `otplib`) exists in the dependency tree, and
  inventing cryptographic verification logic without a tested library would
  be a silent correctness risk. The method throws a clear error directing
  whoever picks this up to add a real library first.
- Refresh tokens are persisted in the `refresh_tokens` table (durable
  revocation tracking) in addition to the existing Redis-based session
  registration, so logout and password-reset can durably invalidate
  sessions rather than relying on Redis TTLs alone.
- New Redis key helpers added to `redis.config.ts`: `RedisKeys.smsOtp()`,
  `RedisKeys.passwordReset()`, with corresponding TTL constants.

## 4. Other new modules built

- **`src/modules/sync/`** — `POST /api/v1/sync`, the mobile offline-sync
  endpoint. Returns `{referrals, patients, notifications, serverTime}`.
  Added `findForSync()` to both `ReferralsRepository` and
  `PatientsRepository` (neither existed; the notifications equivalent,
  `findUnreadForSync()`, already existed and was reused as-is).
- **`src/modules/reports/`** — `GET /county`, `/referral-trends`,
  `/facility-performance`. Reuses the existing `sp_get_county_report` and
  `sp_get_facility_performance` stored procedures, with a mapping layer
  converting their snake_case/minutes-based output into the camelCase/
  hours-based shape the web admin's `report.types.ts` expects.
  `/referral-trends` had no stored procedure, so it's a direct query.
- **`src/modules/audit/`** — `GET /audit-logs`, System Admin only. The write
  path (`audit.middleware.ts` → `sp_create_audit_log`) already existed; this
  adds the read side, joined against `users` for the nested
  `user: {id, username, role} | null` shape the web admin expects.

## 5. Schema corrections in `common.schemas.ts`

Three schemas in this shared file were **dead code with incorrect values**
that happened to match nothing in actual use, since every consuming module
had already shadowed them with correct local definitions:

- `referralStatusSchema` — had an invented 8-state model (`Submitted`,
  `Acknowledged`, `Patient Transferred`, `Cancelled`) matching nothing in
  the database, OpenAPI spec, or implementation. Corrected to the real
  6-state model.
- `urgencyLevelSchema` — had `Immediate/Semi-urgent/Non-urgent`; corrected
  to `Routine/Urgent/Emergent` (the real database ENUM).
- `hospitalStatusSchema` — had `Pending Approval/Active/Suspended`;
  corrected to `Pending/Approved/Suspended` (the real database ENUM).

Two further schemas (`referralTypeSchema`, `hospitalTypeSchema`) don't
correspond to any column in the database at all and aren't imported
anywhere — left in place with explanatory comments rather than deleted or
guess-corrected, in case they're meant for a not-yet-added column.

Added `referralIdParamSchema`, `patientIdParamSchema`, `userIdParamSchema`
alongside the existing `hospitalIdParamSchema`, needed for the route
param-naming normalization in §2.

## 6. Test suite fixes

- **Standardized on Vitest.** Replaced `jest.config.ts` with a merged
  `vitest.config.ts` (adapted from DevOps's own config, with
  `globals: true` added so the bare-global business-module test files work
  unmodified). Every team that wrote any real test code had already used
  Vitest or framework-agnostic bare globals — only the original
  `package.json`/`jest.config.ts` scaffolding specified Jest.
- **`referral-state-machine.test.ts` rewritten** — the original hardcoded
  an 8-state model matching nothing real (same wrong model as the dead
  schema in §5). Rewritten to import directly from the real
  `referrals.state-machine.ts`, verified transition-by-transition against
  `ALLOWED_TRANSITIONS` and `ROLE_TRANSITIONS`.
- **`rbac-matrix.test.ts` rewritten** — the original hardcoded its own copy
  of the permission matrix. It was factually correct (verified identical to
  `ROLE_PERMISSIONS`), but as a duplicate it wouldn't catch future drift.
  Rewritten to import `hasPermission()` from the real
  `authorize.middleware.ts`.
- **4 business-module test files used the Jest mocking API** (`jest.fn`,
  `jest.mock`, `jest.clearAllMocks`) despite the project standardizing on
  Vitest, which doesn't expose a `jest` global. Converted all call sites to
  `vi.fn`/`vi.mock`/`vi.clearAllMocks`.
- Copied `tests/helpers/test-infrastructure.ts` and `vitest-setup.ts`,
  `tests/e2e/`, and `tests/load/` from the DevOps submission unmodified.
  `tests/integration/{auth,patient,referral}.integration.test.ts` copied
  as-is — these dynamically import `src/app.js`, confirming they expect to
  live at `tests/integration/` relative to the backend repo root, which is
  where they now are.
- **`tests/unit/auth.service.test.ts` rewritten and moved.** The original
  file — written before any `auth` module existed — never actually
  imported or called `AuthService`; every assertion checked locally-defined
  literals or a hand-fabricated user object (e.g. `expect(900).toBe(15*60)`,
  `two_fa_enabled` instead of the real `is_two_factor_enabled` column), and
  its `vi.mock()` calls were unused. Replaced with real unit tests at
  `src/modules/auth/auth.test.ts` (co-located with the module, matching the
  pattern of the other four business-module tests) that construct an actual
  `AuthService` with mocked repository dependencies and exercise real
  login/2FA/logout/getMe behavior, including the SMS-vs-TOTP delivery
  method branch and the deliberate TOTP-not-implemented error path.

## 7. Database migrations

Split `PRMS_Database_Complete.sql` (1421 lines) into 16 ordered migration
files in `src/database/migrations/`:

```
000_create_migration_history.sql
001_create_hospitals.sql
002_create_users.sql
003_create_patients.sql
004_create_referrals.sql
005_create_referral_logs.sql
006_create_messages.sql
007_create_notifications.sql
008_create_audit_logs.sql
009_add_foreign_keys.sql
010_create_triggers.sql
011_create_stored_procedures.sql
012_create_views.sql
013_create_reporting_audit_tables.sql
014_create_extended_audit_triggers.sql
015_create_scheduled_event.sql
```

Split at the file's own `-- MIGRATION NNN` markers where present (001–008);
the remaining structural sections (FK constraints, triggers, procedures,
views, the six additional reporting/audit tables, and the scheduled event)
were each given their own migration in dependency order. The trailing
`INSERT INTO migration_history` seed block in the original SQL file was
deliberately **not** included in any migration — `migrate.ts` already
records each migration's application automatically, so including it
verbatim would create a duplicate-key conflict with the tool's own
bookkeeping.

## 8. Seed script

`src/database/seeds/run-seeds.ts` — creates 1 System Admin, 2 approved
hospitals, and 1 Hospital Admin + 1 Clinician + 1 Receptionist per
hospital. Uses the application's real `encrypt()` and `bcrypt` functions
directly (not raw SQL) so seeded PII is encrypted in exactly the format
the rest of the codebase expects to read. Idempotent — safe to re-run.

All seeded accounts use the password `ChangeMe123!`; the script logs a
reminder to change this before any production use.

## 9. Web admin cross-check

Audited every API client and type file in the web admin submission against
the backend. Confirmed field-name corrections in §3 directly against
`auth.types.ts`. Found two additional gaps not in the original report:
`PATCH /hospitals/:hospitalId/status` and `PATCH /users/:userId/status`,
both now added (§2). Noted but did not change: web's `HospitalStatus` type
includes `'Rejected'`, which has no corresponding database ENUM value
(`Pending/Approved/Suspended` only) — flagged with a comment in
`updateHospitalStatusSchema` rather than guessing which side should change.

## 10. Known remaining gaps

- **TOTP-based 2FA** is stubbed, not implemented — see §3.
- **Web admin source code integration** — confirmed all backend contract
  alignment, but no code changes were made to the web admin package itself
  in this session (audit-only).
- **Mobile's `SyncResponse.patients` handling** and the `idType` field
  mismatch (flagged in the original integration report) were not addressed
  in this backend-focused session — both are mobile-side fixes.
- Production secrets (FCM, Africa's Talking, SMTP, JWT RS256 keypair,
  encryption key) still need real values — `.env.example` documents every
  required variable but ships only placeholders.
