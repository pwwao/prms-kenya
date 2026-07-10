# PRMS — OWASP Top 10 Security Review & Hardening
# Architecture Contract §10.6
# Reference: OWASP Top 10:2021

## A01 — Broken Access Control

### Implementation
- JWT RS256 — `authenticate` middleware validates every protected route
- RBAC matrix enforced via `authorize()` and `requirePermission()` middleware
- Facility isolation: `hospitalId` extracted from JWT only — never from client input
- `enforceFacilityIsolation()` middleware blocks cross-hospital data access
- Soft deletes on all entities — no hard-delete exposure

### Verification Checklist
- [ ] Every non-public route has `authenticate` middleware
- [ ] Every route has `authorize([...roles])` guard
- [ ] No `hospitalId` accepted from req.body/req.query on data-scoped endpoints
- [ ] Referral access: source OR destination hospital only
- [ ] System Admin routes verified separately (no hospitalId scoping)

### Test Coverage Required
- [ ] Clinician cannot access Patient records from another hospital
- [ ] Receptionist cannot call `referral:create`
- [ ] Expired token returns 401
- [ ] Revoked token (blacklisted jti) returns 401
- [ ] Tampered JWT returns 401

---

## A02 — Cryptographic Failures

### Implementation
- AES-256-GCM with fresh random IV per encryption operation
- HMAC-SHA256 blind-index for searchable encrypted fields
- RS256 asymmetric JWT signing (private key never in env vars — file path only)
- bcrypt rounds: 12 (production), 4 (test only)
- TLS 1.2/1.3 enforced at Nginx (no TLS 1.0/1.1)
- HSTS with preload enabled
- Passwords never logged or returned in API responses

### Verification Checklist
- [ ] `DATABASE_ENCRYPTION_KEY` is 64 hex chars (32 bytes)
- [ ] `HASH_SALT` is 64 hex chars, distinct from encryption key
- [ ] JWT private key is file-based, not an env var string
- [ ] No plaintext PII in Redis (only encrypted JSON or hashes)
- [ ] No plaintext PII in logs (verify logger output)
- [ ] Audit log `payload_snapshot` stores only body keys, never values

---

## A03 — Injection

### Implementation
- All DB queries use `mysql2` `execute()` (prepared statements)
- Zod schema validation on all request inputs — strips unknown fields
- `safeSortBy()` allowlist prevents ORDER BY injection
- Nginx blocks common SQL injection URI patterns
- No dynamic SQL concatenation anywhere in codebase

### Verification Checklist
- [ ] Grep codebase for raw string template SQL: `\`SELECT.*${`
- [ ] All sort/filter columns validated against allowlists
- [ ] Zod `validate()` middleware applied before every controller
- [ ] File upload endpoints (if any) validate MIME type, not just extension

---

## A04 — Insecure Design

### Implementation
- Architecture Contract mandated before code (design-first)
- Domain-driven design — business rules in Service layer only
- State machine validation for Referral status transitions
- `InvalidStateError` thrown on invalid transitions
- No direct DB access from Controllers

### Verification Checklist
- [ ] Referral state machine tested for all illegal transitions
- [ ] Patient data only decrypted after role/facility check passes
- [ ] No business logic in routes or middleware

---

## A05 — Security Misconfiguration

### Implementation
- Helmet.js: X-Frame-Options, X-Content-Type-Options, CSP, HSTS
- Nginx: server_tokens off, no version headers
- Non-root Docker user (uid 1001)
- Read-only container filesystem (except /app/logs, /tmp)
- Internal Docker network (`backend` network not externally reachable)
- MySQL: local_infile=0, skip_symbolic_links=1
- Redis: requirepass, protected-mode yes, bind 0.0.0.0 (internal network only)
- PM2: source maps, no --inspect in production

### Verification Checklist
- [ ] `curl -I https://api.prms.health.go.ke` — no Server version header
- [ ] All security headers present in response
- [ ] Docker containers run as non-root: `docker inspect prms_api --format '{{.Config.User}}'`
- [ ] MySQL not exposed on host network in production
- [ ] Redis not exposed on host network in production
- [ ] `/health` endpoint returns no sensitive info

---

## A06 — Vulnerable and Outdated Components

### Implementation
- `npm audit` runs in every PR pipeline
- Trivy container scan in PR pipeline and weekly schedule
- TruffleHog secret scanning in weekly schedule
- Node.js 20 LTS (supported until April 2026)
- Base image: `node:20-alpine` (minimal attack surface)
- `dumb-init` as PID 1 (proper signal handling)

### Verification Checklist
- [ ] `npm audit --audit-level=high` returns clean
- [ ] Trivy scan: no HIGH/CRITICAL CVEs in base image
- [ ] All dependencies pinned to exact versions in package-lock.json
- [ ] Weekly automated audit workflow active

---

## A07 — Identification and Authentication Failures

### Implementation
- RS256 JWT access tokens (15 min expiry)
- Refresh tokens (7 days, stored in Redis, single-use on rotation)
- Pre-auth tokens for 2FA challenge (5 min, single-use)
- Redis blacklist for immediate token revocation on logout
- bcrypt(12) for password hashing
- 2FA via TOTP (6-digit, 30s window)
- Rate limiting: 5 login attempts / 15 min, 3 OTP attempts / 5 min
- Account suspension blocks all token issuance

### Verification Checklist
- [ ] Brute force: 6th login attempt returns 429
- [ ] Logout: original access token returns 401 within TTL
- [ ] Refresh token rotation: old refresh token rejected after use
- [ ] Suspended account: login returns 401 AUTH_ACCOUNT_SUSPENDED
- [ ] 2FA bypass: pre-auth token cannot be reused

---

## A08 — Software and Data Integrity Failures

### Implementation
- Docker images tagged by Git SHA (no `:latest` in production pulls)
- ECR image scanning enabled
- GitHub Actions: `actions/checkout@v4` (pinned major version)
- package-lock.json committed and enforced via `npm ci`
- Migration checksums stored in `migration_history` table

### Verification Checklist
- [ ] CI never pulls `:latest` tag for deployment
- [ ] All GitHub Actions use pinned SHA or major version tags
- [ ] Migration checksums verified before re-applying

---

## A09 — Security Logging and Monitoring Failures

### Implementation
- Winston structured JSON logs (production)
- Morgan HTTP access log → Winston
- `audit_logs` table via `sp_create_audit_log` stored procedure
- `audit_security_events` table for auth events
- `writeSecurityEvent()` called on: login, logout, failed auth, 2FA events
- All logs include `requestId`, `userId`, `action`, `timestamp`
- PM2 error and combined logs with daily rotation
- Nginx access log in JSON format

### Verification Checklist
- [ ] Failed login attempts logged with IP address
- [ ] Successful logins logged with userId and hospitalId
- [ ] Every 401/403 response has an audit_security_events record
- [ ] Logs contain no plaintext passwords or PII values
- [ ] Log rotation configured (14-day retention minimum)

---

## A10 — Server-Side Request Forgery (SSRF)

### Implementation
- No user-controlled URL fetching in current scope
- External service calls (FCM, Africa's Talking, SMTP) use hardcoded endpoints from env config
- Axios instances (if used) should have allowlisted base URLs only

### Verification Checklist
- [ ] No endpoint accepts a URL as input and fetches it
- [ ] External HTTP clients use base URL from config only
- [ ] Webhook endpoints (if added later) validate source IP/HMAC signature
