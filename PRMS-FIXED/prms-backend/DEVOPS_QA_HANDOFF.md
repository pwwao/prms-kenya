

# PRMS — DevOps, Security & QA Handoff
**Version:** 1.0 | **Owner:** DevOps / Security / QA Team
**Stack:** Docker · Nginx · PM2 · GitHub Actions · k6 · Playwright · Vitest · Prometheus

---

## 1. Repository Layout

```
prms-devops/
├── .github/
│   ├── workflows/
│   │   ├── pr-pipeline.yml          ← Lint, typecheck, test, docker build (every PR)
│   │   ├── staging-deploy.yml       ← Auto-deploy on merge to develop
│   │   ├── production-deploy.yml    ← Manual-gate deploy on merge to main
│   │   ├── load-tests.yml           ← k6 load tests (manual + weekly Sunday)
│   │   ├── db-backup.yml            ← Daily DB backup to S3 (01:00 UTC)
│   │   └── security-audit.yml       ← Weekly Trivy + TruffleHog (Monday 08:00 UTC)
│   └── SECRETS_REFERENCE.md         ← All required GitHub secrets documented
│
├── docker/
│   ├── Dockerfile                   ← Multi-stage production image (non-root, dumb-init)
│   └── mysql/my.cnf                 ← MySQL 8 production tuning
│
├── nginx/
│   ├── nginx.conf                   ← Main config (rate limit zones, gzip, SSL globals)
│   ├── conf.d/api.conf              ← API virtual host (HTTPS, WSS, auth rate limits)
│   └── snippets/
│       ├── security-headers.conf    ← OWASP headers (HSTS, CSP, X-Frame-Options)
│       └── proxy-params.conf        ← Upstream proxy headers
│
├── monitoring/
│   ├── prometheus.yml               ← Scrape config (API, MySQL, Redis, Nginx, host)
│   ├── alerts.yml                   ← SLO-based alert rules
│   └── alertmanager.yml             ← Routes (critical→PagerDuty+Slack, warning→Slack)
│
├── scripts/
│   ├── secrets.sh                   ← Secret init, rotation, verification
│   ├── harden-server.sh             ← Ubuntu CIS L1 baseline hardening
│   ├── deploy.sh                    ← Zero-downtime rolling deploy + auto-rollback
│   └── db-backup.sh                 ← Encrypted backup → S3, restore, list
│
├── security/
│   └── OWASP_REVIEW.md              ← OWASP Top 10 review + verification checklists
│
├── tests/
│   ├── helpers/
│   │   ├── test-infrastructure.ts   ← Shared fixtures, seed factories, JWT helpers
│   │   └── vitest-setup.ts          ← Global env injection, console suppression
│   ├── unit/
│   │   ├── auth.service.test.ts     ← Auth: password verify, 2FA, rate limit constants
│   │   ├── referral-state-machine.test.ts ← All valid/invalid referral transitions
│   │   └── rbac-matrix.test.ts      ← Exhaustive role × permission coverage
│   ├── integration/
│   │   ├── auth.integration.test.ts     ← Login, logout, refresh, rate limiting
│   │   ├── referral.integration.test.ts ← CRUD, state, RBAC, facility isolation
│   │   └── patient.integration.test.ts  ← Register, search, PII masking by role
│   ├── e2e/
│   │   └── referral-lifecycle.e2e.ts    ← Full 11-step referral workflow + security
│   └── load/
│       ├── load-test.ts             ← k6 scenarios: load, stress, spike, soak
│       └── seed-load-test.ts        ← Seeds 5 users + referrals for k6
│
├── docker-compose.yml               ← Dev: MySQL + Redis + Redis Commander + Mailhog
├── docker-compose.prod.yml          ← Prod: Nginx + API + MySQL + Redis + Certbot
├── docker-compose.monitoring.yml    ← Prometheus + Grafana + Alertmanager
├── ecosystem.config.cjs             ← PM2 cluster, restart policy, logging
├── playwright.config.ts             ← E2E test config
├── vitest.config.ts                 ← Unit/integration config, coverage thresholds
└── package.json                     ← Test + security scripts
```

---

## 2. Branch & Deploy Strategy

```
feature/* → develop → main
              │           │
              ▼           ▼
           Staging    Production
          (auto)     (manual gate)
```

| Branch | Trigger | Pipeline | Deploy target |
|---|---|---|---|
| `feature/*` | PR opened/updated | `pr-pipeline.yml` | None (build check only) |
| `develop` | Merge | `staging-deploy.yml` | Staging (auto) |
| `main` | Merge | `production-deploy.yml` | Production (requires approval) |

### PR Gates (all must pass before merge)
1. ESLint — zero errors
2. TypeScript — zero type errors
3. Jest/Vitest — all tests pass
4. Coverage — ≥ 80% lines/functions/branches
5. `npm audit` — no HIGH/CRITICAL CVEs
6. Trivy — no HIGH/CRITICAL in filesystem scan
7. Docker build — image builds successfully

---

## 3. First-Time Server Setup

Run once on a fresh Ubuntu 22.04 server before any deploy:

```bash
# 1. Harden the OS
sudo bash devops/scripts/harden-server.sh

# 2. Generate secrets
bash devops/scripts/secrets.sh init

# 3. Populate .env from template
cp backend/.env.example /opt/prms/.env
# Edit /opt/prms/.env with real values

# 4. Copy keys to server
scp -r keys/ deploy@server:/opt/prms/keys/

# 5. Start the stack
cd /opt/prms
IMAGE_TAG=latest docker-compose -f docker-compose.prod.yml up -d

# 6. Run migrations
docker-compose -f docker-compose.prod.yml exec api node dist/database/migrate.js

# 7. Verify
curl https://api.prms.health.go.ke/health
```

---

## 4. SSL Certificate Setup (Let's Encrypt)

```bash
# Initial certificate issuance (before Nginx can serve HTTPS)
# 1. Start Nginx in HTTP-only mode first (comment out ssl_certificate lines)
# 2. Issue cert via Certbot:
docker run --rm \
  -v certbot_www:/var/www/certbot \
  -v certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d api.prms.health.go.ke \
  --email devops@prms.health.go.ke \
  --agree-tos --no-eff-email

# 3. Uncomment ssl_certificate lines in nginx/conf.d/api.conf
# 4. Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx

# Renewal is automatic via the certbot service in docker-compose.prod.yml
```

---

## 5. CI/CD Secrets Setup

Configure all secrets listed in `.github/SECRETS_REFERENCE.md` under:
**GitHub → Settings → Secrets and variables → Actions**

Create two **GitHub Environments**:
- `staging` — no required reviewers
- `production` — ≥ 1 required reviewer from the DevOps team

---

## 6. Running Tests

```bash
# Install
npm install

# Unit tests only (no DB/Redis needed)
npm run test:unit

# Integration tests (requires MySQL + Redis running)
docker-compose up -d mysql redis
npm run test:integration

# All tests with coverage report
npm run test:coverage

# E2E (requires running API on staging or local)
BASE_URL=https://staging-api.prms.health.go.ke npm run test:e2e

# Load tests
npm run seed:load                    # seed k6 test users first
npm run test:load                    # baseline (50 VUs, 5min)
npm run test:load:stress             # ramp to 200 VUs
npm run test:load:spike              # sudden burst to 300 VUs
npm run test:load:soak               # 30 VUs for 30 minutes
```

---

## 7. Performance SLOs & Thresholds

| Metric | Target | Alert threshold |
|---|---|---|
| Availability | ≥ 99.5% uptime | API down > 1 min → PagerDuty |
| p95 response time | < 500ms | > 500ms for 5min → Slack warning |
| p99 response time | < 1000ms | Tracked, not alerted |
| Error rate (5xx) | < 1% | > 1% for 2min → PagerDuty |
| DB connections | < 80% of max | > 80% for 2min → Slack warning |
| Redis memory | < 85% of max | > 85% for 5min → Slack warning |
| Disk space | > 15% free | < 15% → Slack, < 5% → PagerDuty |

---

## 8. Backup & Recovery

| Schedule | Action | Retention |
|---|---|---|
| Daily 01:00 UTC | Full MySQL dump → encrypted → S3 | 30 days |
| Weekly | Verify backup restore on staging | — |

```bash
# Manual backup
bash devops/scripts/db-backup.sh backup

# List available backups
bash devops/scripts/db-backup.sh list

# Restore (staging only — never run on production without approval)
bash devops/scripts/db-backup.sh restore backups/prms_backup_20250115_010000.sql.gz.enc
```

**RTO target:** < 4 hours
**RPO target:** < 24 hours (daily backup cadence)

---

## 9. Secret Rotation Schedule

| Secret | Rotation frequency | Method |
|---|---|---|
| JWT RS256 key pair | Every 90 days | `secrets.sh rotate-jwt` |
| `DATABASE_ENCRYPTION_KEY` | Only on compromise | Manual + re-encrypt all PII |
| `HASH_SALT` | Only on compromise | Manual + re-hash all indexes |
| `DB_PASSWORD` | Every 180 days | AWS Secrets Manager rotation |
| `REDIS_PASSWORD` | Every 180 days | Manual + rolling restart |

```bash
# Verify all secrets before deploy
bash devops/scripts/secrets.sh verify

# Rotate JWT keys (zero-downtime — tokens valid for remaining 15min TTL)
bash devops/scripts/secrets.sh rotate-jwt
docker-compose -f docker-compose.prod.yml restart api
```

---

## 10. Security Verification Checklist

Run before every production release:

```bash
# Dependency audit
npm audit --audit-level=high

# Container scan
trivy image prms-api:latest --severity HIGH,CRITICAL

# Secret scan
trufflehog git file://. --only-verified

# OWASP headers check
curl -I https://api.prms.health.go.ke | grep -E \
  "(X-Frame-Options|X-Content-Type|Strict-Transport|Content-Security)"

# Verify non-root container
docker inspect prms_api --format='User: {{.Config.User}}'
# Expected: User: prms (or uid 1001)

# Verify no plaintext PII in logs
docker-compose logs api | grep -i "national_id\|password\|full_name" || echo "Clean"

# Verify auth rate limiting
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://api.prms.health.go.ke/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  echo "Attempt $i: $STATUS"
done
# Attempt 6 should return 429
```

---

## 11. Monitoring Access

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://server:3001 | admin / (see GRAFANA_PASSWORD env) |
| Prometheus | http://server:9090 | Internal only |
| Alertmanager | http://server:9093 | Internal only |

**Key Grafana dashboards to import:**
- Node Exporter Full (ID: 1860)
- MySQL Overview (ID: 7362)
- Redis Dashboard (ID: 11835)
- Nginx (ID: 12708)
- Create custom PRMS Business Metrics dashboard using `prms_*` metrics

---

## 12. Rollback Procedure

```bash
# Automatic rollback — triggered by CI if health checks fail after deploy

# Manual rollback — SSH to server
ssh deploy@server
cd /opt/prms
PREV=$(cat rollback_image.txt)
IMAGE_TAG=$PREV docker-compose -f docker-compose.prod.yml up -d --no-deps api
sleep 15
curl http://localhost:3000/health
```

---

## 13. On-Call Runbooks

### API Down
1. Check `docker ps` — is `prms_api` running?
2. Check `docker logs prms_api --tail=50`
3. Check MySQL: `docker exec prms_mysql mysqladmin ping`
4. Check Redis: `docker exec prms_redis redis-cli ping`
5. If container crashed: `docker-compose -f docker-compose.prod.yml restart api`
6. If DB issue: check `/opt/prms/logs/` for migration errors
7. Last resort: rollback to previous image (§12 above)

### High Error Rate
1. Check `docker logs prms_api --tail=100 | grep ERROR`
2. Check `docker logs prms_nginx --tail=50`
3. Identify failing endpoint from Grafana `http_requests_total` by path
4. Check if a recent deploy caused the regression → rollback if yes

### Database Connection Exhaustion
1. Check pool usage: `SHOW STATUS LIKE 'Threads_connected'`
2. Check for long-running queries: `SHOW PROCESSLIST`
3. Kill stuck queries if needed: `KILL <process_id>`
4. Increase `DB_POOL_MAX` in .env and restart API if sustained

### Redis OOM
1. Check memory: `docker exec prms_redis redis-cli INFO memory`
2. Check key count: `docker exec prms_redis redis-cli DBSIZE`
3. If cache keys are bloated: `docker exec prms_redis redis-cli FLUSHDB` (clears all cache — sessions also lost, users re-login)
4. Increase `maxmemory` in Redis config and restart
