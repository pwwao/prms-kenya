# PRMS — Integration Team Final Report

**Scope reviewed:** Architecture Contract v1.0, Database Complete SQL, API Reference v1.0, OpenAPI v1.0, Design System, UI/UX User Roles & Flows, Backend Platform, Core Business Modules, Communication Module, Mobile App, DevOps/QA.

**Not reviewed:** Web team source code (not yet submitted — only the UI/UX role and flow spec was provided, which is a design reference, not implementation). Section 6 below notes what to re-check once it arrives.

---

## 1. Merge Plan

Merge order matters because several packages depend on files that don't exist until earlier steps complete. Follow this sequence.

### Step 1 — Clean the Backend Platform repo
- Delete the stray `src/{config,middleware,shared...}` directory (a packaging artifact, not real code).
- Fix `src/shared/base.repository.ts` and `src/shared/base.service.ts`: change `../../config/...` to `../config/...` in both files.
- Add the missing `logger` import to `src/server.ts`: `import { logger } from './config/logger.config.js';`

### Step 2 — Merge Core Business Modules into Backend Platform
- Copy `core-business-modules/src/modules/{hospitals,users,patients,referrals}` into `prms-backend/src/modules/`.
- Copy `core-business-modules/src/modules/index.ts` (the `registerBusinessModules` aggregator) into `prms-backend/src/modules/index.ts`.
- In `prms-backend/src/server.ts`, where the `TODO` comment currently sits for route registration, add:
  ```ts
  import { registerBusinessModules } from './modules/index.js';
  // ...inside bootstrap(), section "3. Register API v1 routes":
  registerBusinessModules(app);
  ```
- Before wiring this in, apply the fixes from Section 2 (Refactoring Plan) to `referrals.routes.ts` — the route registers cleanly but has a compile-breaking permission string error, and a contract-deviating path that should be corrected at this point rather than after merge.

### Step 3 — Merge Communication Module into Backend Platform
- Copy `comms-module/src/modules/{chat,notifications}` into `prms-backend/src/modules/`.
- Follow `comms-module/src/server.integration.patch.ts` literally — it is accurate and complete. Specifically:
  - Add the imports listed in its Step 1 to `server.ts`.
  - Add `app.use('/api/v1/referrals', chatRouter)` and `app.use('/api/v1/notifications', notificationsRouter)` in the routes section.
  - Add the Socket.IO gateway registration (`registerChatGateway(io)`), `NotificationsService` instantiation, subscriber registration, and worker startup exactly where its Step 6 specifies.
  - Add the shutdown hook from its Step 9.
- Run `npm install firebase-admin nodemailer axios && npm install -D @types/nodemailer` in the backend repo (axios is already present; the other three are not).
- Add the env vars listed in the patch file (`FCM_*`, `AFRICASTALKING_*`, `SMTP_*`) to `.env.example` and your secrets manager — these aren't currently in either.
- Use the `noopEventContextResolver` for the first merged build (it's a valid no-op). Don't wire in the "real resolver" example from the patch comments yet — it depends on `ReferralParticipants` and a `UsersRepository` method that don't exist yet (see Missing Components, Section 3).

### Step 4 — Build and merge the `auth` module
This doesn't exist in any submitted package and has to be authored before the system can run end-to-end. It slots into `prms-backend/src/modules/auth/` following the same Clean Architecture layering as every other module (controller → service → repository → routes). All the primitives it needs already exist in `shared/services/token.service.ts`, `shared/services/hash.service.ts`, and bcrypt is already a dependency — this is wiring, not new infrastructure. Required endpoints, per the OpenAPI spec (the most precise of the four reference docs on this point):

`POST /auth/login`, `POST /auth/verify-2fa`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `PATCH /auth/change-password`, `POST /auth/register-device`.

Once built, register it in `server.ts` alongside the other module routers: `app.use('/api/v1/auth', authRouter)`.

### Step 5 — Generate migrations and seeds
- Split `PRMS_Database_Complete.sql` into the numbered migration files `migrate.ts` expects in `src/database/migrations/` (one file per `-- MIGRATION NNN` comment block already present in the SQL — there are clean markers to split on).
- Author `src/database/seeds/run-seeds.ts` (referenced by `package.json`'s `seed` script but not present in any package) with at minimum a System Admin user and one approved hospital, so a fresh environment is usable immediately after migration.

### Step 6 — Merge DevOps/QA
- Copy `prms-devops/tests/{unit,integration,e2e}` into `prms-backend/tests/` — this matches what `auth.integration.test.ts` already assumes (`import('../../src/app.js')` resolves correctly from this location).
- Copy `prms-devops/docker-compose*.yml`, `nginx/`, `monitoring/`, `.github/workflows/`, and `scripts/` to the backend repo root or a sibling ops directory per your team's usual convention.
- Resolve the test-runner conflict before running CI (see Refactoring Plan, item 7) — as submitted, the merged repo would have a `jest.config.ts` from Backend Platform and a `vitest.config.ts` + Vitest-only test files from Comms and DevOps, which is not a working state.
- Don't enable `auth.integration.test.ts` or `referral.integration.test.ts` in CI until Steps 4 and the refactors in Section 2 are complete — they will fail immediately otherwise, correctly, since they're testing real gaps.

### Step 7 — Mobile and Web
- Mobile requires no merge into the backend repo; it's a separate deployable. It needs Steps 1–5 complete server-side before it can be tested end-to-end, particularly the `/auth/*` and `/sync` endpoints.
- Web: pending submission. Once received, check its API client against the same corrected referral-status contract (Section 2, item 1) and confirm it doesn't also need the missing `/reports/*` or `/audit-logs` endpoints to render the screens the UI/UX spec describes (System Reports, Audit Log Viewer) — based on the route map in that spec, it will.

---

## 2. Refactoring Plan

Ordered by what blocks compilation first.

1. **`referrals.routes.ts` — fix the permission string and align with the formal contract.** Currently `requirePermission('referral:transition')` doesn't typecheck against `TPermission`. While fixing this, also correct the path and method to match the OpenAPI spec (which mobile already correctly implements against): change `POST /:id/transition` to `PATCH /:referralId/status`, and rename the validator's `newStatus` field to `status` to match both the wire contract and mobile's `UpdateReferralStatusRequest`. Use `requirePermission('referral:dispatch')` or `'referral:receive'` depending on which transition is being requested, consistent with how the rest of the permission matrix is structured, or extend `TPermission` with a deliberate `'referral:transition'` entry if a single combined permission is preferred — either is a reasonable design choice, but it has to be made explicitly rather than left as a typo.

2. **Normalize route param names.** `hospitals.routes.ts`, `patients.routes.ts`, `referrals.routes.ts`, and `users.routes.ts` all use generic `:id`; the contract and OpenAPI spec specify `:hospitalId`, `:patientId`, `:referralId`, `:userId`. Mobile and (presumably) Web already use the specific names in their type definitions. This is a mechanical rename in each route file plus the corresponding `idParamSchema` validators.

3. **Reconcile `POST /hospitals` auth requirement.** Code requires authentication; OpenAPI and the architecture contract mark it Public. Decide which is correct (a public self-registration flow is unusual given the rest of the system's access control posture, so confirm this is an intentional design choice and not a doc error) and update whichever side is wrong.

4. **Fix the two broken relative imports** in `shared/base.repository.ts` and `shared/base.service.ts` (covered in Merge Plan Step 1, repeated here since it's also a refactor item, not just a merge step).

5. **Rewrite `referral-state-machine.test.ts` (DevOps).** It encodes an 8-state model (`Submitted`, `Acknowledged`, `Patient Transferred`, `Cancelled`) that matches none of the four authoritative sources — not the database ENUM, not the architecture contract's state diagram, not the OpenAPI `ReferralStatus` schema, and not the real `referrals.state-machine.ts`. All four of those agree on six states: `Draft, Dispatched, Received, Accepted, Rejected, Completed`. The real implementation is correct; rewrite the test against it, ideally by importing `ALLOWED_TRANSITIONS` from the real module rather than re-encoding the matrix a second time.

6. **Import, don't duplicate, the RBAC matrix in `rbac-matrix.test.ts`.** Unlike the state-machine test, this one is factually correct today — it matches `ROLE_PERMISSIONS` in `authorize.middleware.ts` exactly. But it's a hardcoded copy, so it will silently stop catching drift the next time someone edits the real matrix. Change it to `import { ROLE_PERMISSIONS } from '../../src/middleware/authorize.middleware.js'` and assert against that directly.

7. **Resolve the Jest/Vitest conflict.** Architecture Contract §1.2 specifies Jest; Backend Platform's `package.json` and `jest.config.ts` agree; but DevOps's entire toolchain is Vitest, and the five Comms-module test files (`chat.test.ts`, three `notifications-*.test.ts`, `notifications.test.ts`) were written in Vitest syntax (`vi.mock`, `from 'vitest'`) following DevOps's lead. Pick one: either standardize the whole merged repo on Vitest (matches what three of five teams already produced) and update Backend Platform's config and any Jest-specific syntax in its own tests, or keep Jest as specified and rewrite the comms and DevOps test files. Given that 80% of the actual test code submitted is already Vitest, standardizing on Vitest is probably the lower-effort path, but that's a call for whoever owns the testing strategy, not something to default into silently.

8. **Add `idType` support to the backend, or drop it from mobile.** Mobile's `Patient` type, `CreatePatientRequest`, and WatermelonDB schema all carry an `idType` field (e.g., National ID vs. Passport) that has no equivalent column, validator field, or service logic anywhere in the backend. Right now it's silently dropped by Zod on every create. Pick one: add `id_type` as a column and thread it through `patients.validator.ts` / `.service.ts` / `.repository.ts`, or remove the field from mobile if it was speculative and isn't actually needed yet.

9. **Apply `SyncResponse.patients` in mobile's `performSync()`.** The type already includes `patients: Partial<Patient>[]`, but `src/db/sync.ts` only destructures and applies `referrals` and `notifications` from the sync response — patient updates pulled from the server are silently discarded. Add an `applyServerPatients()` function mirroring the existing `applyServerReferrals()`/`applyServerNotifications()` pattern.

10. **Add the missing `/auth/register-device` endpoint to the Architecture Contract's own §8.7 table.** This is a documentation gap, not a code gap — the OpenAPI spec fully documents this endpoint and mobile correctly implements it, but the architecture contract's own endpoint registry omits it. Low priority, but worth a one-line addition so the contract document stays the actual source of truth.

---

## 3. Missing Components List

| Component | Owner (suggested) | Severity | Notes |
|---|---|---|---|
| Entire `auth` module (controller/service/repository/routes, 9 endpoints) | Backend Platform or Business team | Critical | All underlying primitives already exist in `shared/services/`; this is integration work, not new design. |
| Route registration in `server.ts` | Backend Platform | Critical | Business and Comms modules are both ready to mount; nobody has called the wiring. |
| `POST /api/v1/sync` endpoint | Business or Comms team | Critical | `findUnreadForSync()` repository method already exists; needs a controller, a route, and assembly of the combined `{referrals, patients, notifications, serverTime}` response. Mobile is fully built against this and currently has nothing to call. |
| `src/database/migrations/*.sql` (split from `PRMS_Database_Complete.sql`) | Backend Platform / DBA | Critical | `migrate.ts` and the deploy docs both expect these; currently absent. |
| `src/database/seeds/run-seeds.ts` | Backend Platform | High | Referenced by `package.json`'s `seed` script; absent. Needed for any environment to be usable post-migration. |
| `GET /audit-logs` (read endpoint) | Business team | Medium | Write path (`audit.middleware.ts` → `sp_create_audit_log`) works; nothing exposes it for the System Admin Audit Log Viewer screen the UI/UX spec describes. |
| `/reports/county`, `/reports/referral-trends`, `/reports/facility-performance` | Business team | Medium | Fully specified in OpenAPI with query params; zero implementation. Needed for both the System Admin Reports screen and Hospital Admin Facility Reports screen per the UI/UX spec. |
| `referral-participants.repository.ts` | Comms or Business team | Low | Referenced in the comms integration patch's example "real resolver" code as a way to look up chat/notification participants for a referral. The pattern to build it already exists — copy `ChatAccessGuard`'s read-only, narrow-query approach. |
| `UsersRepository.findActiveUserIdsByHospital()` | Business team | Low | Needed by the same real-resolver wiring above; doesn't exist on `UsersRepository` yet. Until both this and the item above exist, notifications run on the `noopEventContextResolver`, meaning hospital-name lookups and participant fan-out for push/email/SMS won't actually resolve real data. |
| `id_type` column + validator/service support for patients | Business team | Low | See Refactoring Plan item 8 — currently a mobile-only field with no backend counterpart. |

---

## 4. Final Project Structure

This reflects the backend monorepo after all merge steps above are applied. Mobile and Web remain separate repos/deployables per the architecture contract's polyrepo-per-platform pattern.

```
prms-backend/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml              ← from devops-qa
├── docker-compose.monitoring.yml        ← from devops-qa
├── ecosystem.config.cjs
├── jest.config.ts  OR  vitest.config.ts ← pick one, see Refactor item 7
├── package.json                         ← merged deps: + jsonwebtoken, firebase-admin,
│                                            nodemailer, @types/nodemailer, @types/jsonwebtoken
├── playwright.config.ts                 ← from devops-qa
├── tsconfig.json
│
├── .github/workflows/                   ← from devops-qa (pr-pipeline, staging-deploy,
│                                            production-deploy, load-tests, db-backup,
│                                            security-audit)
├── docker/                              ← from devops-qa (prod Dockerfile, mysql tuning)
├── nginx/                               ← from devops-qa
├── monitoring/                          ← from devops-qa (prometheus, alerts, alertmanager)
├── scripts/                             ← merged: backend's own scripts/ + devops-qa's
│                                            (secrets.sh, harden-server.sh, deploy.sh, db-backup.sh)
├── security/OWASP_REVIEW.md             ← from devops-qa
│
├── src/
│   ├── app.ts
│   ├── server.ts                        ← patched per Merge Plan Steps 2–4
│   ├── index.ts                         ← @prms/platform barrel export (optional convenience)
│   │
│   ├── config/                          ← database, redis, jwt, logger, encryption, server config
│   ├── middleware/                      ← authenticate, authorize, audit, rate-limit, validate
│   │
│   ├── shared/
│   │   ├── base.repository.ts           ← fixed import path
│   │   ├── base.service.ts              ← fixed import path
│   │   ├── base.gateway.ts
│   │   ├── response.helper.ts
│   │   ├── pagination.helper.ts
│   │   ├── errors/
│   │   ├── services/                    ← crypto, hash, token, cache
│   │   ├── schemas/                     ← common Zod schemas
│   │   └── queue/                       ← BullMQ setup
│   │
│   ├── database/
│   │   ├── migrate.ts
│   │   ├── migrations/                  ← NEW: numbered SQL files split from
│   │   │                                   PRMS_Database_Complete.sql
│   │   └── seeds/
│   │       └── run-seeds.ts             ← NEW
│   │
│   └── modules/
│       ├── index.ts                     ← registerBusinessModules aggregator
│       ├── auth/                        ← NEW — controller, service, repository, routes, validator
│       ├── hospitals/                   ← from core-business-modules; routes param-name fix applied
│       ├── users/                       ← from core-business-modules; + findActiveUserIdsByHospital()
│       ├── patients/                    ← from core-business-modules; + id_type if adopted
│       ├── referrals/                   ← from core-business-modules; status route + permission fix applied
│       │   └── referral-participants.repository.ts  ← NEW
│       ├── chat/                        ← from comms-module, unchanged
│       └── notifications/               ← from comms-module, unchanged
│
└── tests/                                ← from devops-qa
    ├── helpers/                          ← test-infrastructure.ts, vitest-setup.ts (or jest equiv.)
    ├── unit/                             ← auth.service, referral-state-machine (rewritten),
    │                                        rbac-matrix (import-based)
    ├── integration/                      ← auth, referral, patient integration tests
    ├── e2e/                              ← referral-lifecycle.e2e.ts
    └── load/                             ← k6 load-test.ts, seed-load-test.ts

prms-mobile/                              ← unchanged structure; no merge needed
└── src/
    ├── api/ (client, services, pushNotifications)
    ├── db/ (WatermelonDB schema, models, sync)
    ├── store/ (Redux slices)
    ├── navigation/
    └── ...

prms-web/                                 ← pending submission
```

---

## 5. Production Release Checklist

**Code correctness**
- [ ] `auth` module built and all 9 endpoints implemented and routed
- [ ] `registerBusinessModules(app)` and comms routers/gateway actually called from `server.ts`
- [ ] `shared/base.repository.ts` and `shared/base.service.ts` import paths fixed
- [ ] `logger` imported in `server.ts`
- [ ] `referrals.routes.ts` permission string fixed; route path/method/field name aligned to OpenAPI spec
- [ ] Route params normalized to `:hospitalId` / `:patientId` / `:referralId` / `:userId` across all modules
- [ ] `POST /hospitals` auth requirement reconciled with spec (one or the other corrected)
- [ ] `POST /api/v1/sync` implemented and tested against mobile's actual request/response shape
- [ ] `GET /audit-logs` implemented
- [ ] `/reports/*` (county, referral-trends, facility-performance) implemented
- [ ] Stray `{config,middleware,shared...}` artifact directory removed from the repo

**Dependencies & build**
- [ ] `jsonwebtoken`, `@types/jsonwebtoken`, `firebase-admin`, `nodemailer`, `@types/nodemailer` added to `package.json`
- [ ] `npm run build` (or equivalent `tsc --noEmit`) passes with zero errors after all module merges
- [ ] Test runner conflict resolved (Jest vs. Vitest) and `npm test` runs the full merged suite successfully
- [ ] `referral-state-machine.test.ts` rewritten against the real 6-state model
- [ ] `rbac-matrix.test.ts` imports the real `ROLE_PERMISSIONS` instead of duplicating it

**Database**
- [ ] `PRMS_Database_Complete.sql` split into numbered migration files under `src/database/migrations/`
- [ ] `src/database/seeds/run-seeds.ts` written and produces at least one System Admin + one approved hospital
- [ ] Migrations run cleanly against a fresh MySQL 8 instance: `node dist/database/migrate.js`
- [ ] Seed script runs cleanly post-migration

**Configuration & secrets**
- [ ] `.env.example` updated with `FCM_*`, `AFRICASTALKING_*`, `SMTP_*` variables from the comms integration patch
- [ ] All secrets listed in `.github/SECRETS_REFERENCE.md` populated in GitHub Environments (`staging`, `production`)
- [ ] `production` GitHub Environment has ≥1 required reviewer configured

**Security**
- [ ] `npm audit --audit-level=high` clean
- [ ] Trivy filesystem scan clean (HIGH/CRITICAL)
- [ ] OWASP Top 10 checklist in `security/OWASP_REVIEW.md` walked through against the merged codebase, specifically re-verifying facility isolation and PII masking now that `auth` and the missing routes exist
- [ ] JWT RS256 keys generated and deployed (per OpenAPI spec's `bearerFormat: JWT` + RS256 note) — confirm this matches what `token.service.ts` actually signs with, since the contract text I reviewed didn't explicitly state the algorithm
- [ ] AES-256-GCM encryption key and HMAC hash salt provisioned and rotated out of any test/default values

**Integration verification**
- [ ] Mobile app's full auth flow (login → 2FA → token refresh → logout) tested against the real `auth` module once built
- [ ] Mobile offline sync flow (`performSync()`) tested end-to-end against the real `/sync` endpoint, including patient updates (post Refactor item 9 fix)
- [ ] Chat REST history (`GET /referrals/:id/messages`) and Socket.IO `/chat` namespace tested together for a single referral across two test users
- [ ] Push notification delivery tested via at least one real FCM round-trip in staging
- [ ] Email and SMS channels (`email.channel.ts`, `sms.channel.ts`) verified against real SMTP/Africa's Talking credentials in staging, not just unit-mocked

**Infrastructure**
- [ ] `docker-compose.prod.yml` brings up the full stack (Nginx, API, MySQL, Redis, Certbot) cleanly
- [ ] SSL certificate issued and Nginx serving HTTPS
- [ ] Prometheus/Grafana/Alertmanager stack running and alert routes (PagerDuty/Slack) verified with a test alert
- [ ] Daily DB backup job (`db-backup.yml`) run at least once manually and restore verified on staging
- [ ] Server hardening script (`harden-server.sh`) run on the production host

**Sign-off**
- [ ] Load test baseline (`test:load`, 50 VUs / 5 min) run against staging and p95/p99 thresholds from the SLO table met
- [ ] E2E referral lifecycle test (`referral-lifecycle.e2e.ts`) passing against staging
- [ ] Web team output integrated and verified (pending — re-run this checklist's relevant items once received)

---

## 6. Open Item — Web Team

No Web source code has been submitted yet, only `PRMS_UserRoles_UserFlows_UITeam.md`, which is a UI/UX design and flow specification, not implementation. Once Web code arrives, re-check it against:
- The same referral-status contract correction (path, method, field name) called out in Refactoring Plan item 1
- Whether it depends on `/reports/*` and `/audit-logs` to render the System Reports, Facility Reports, and Audit Log Viewer screens documented in the UI/UX spec's navigation map — based on that spec, it will, so those backend endpoints should be prioritized accordingly
- Route param naming consistency (`:hospitalId`, `:userId`) matching whatever the Web team's API client assumed
- Whether its build tooling and test runner choice adds a third or fourth variant to the Jest/Vitest conflict already present
