/**
 * Load Tests — k6
 * Architecture Contract §15.4 — Performance targets:
 *   - p95 response time < 500ms
 *   - Error rate < 1%
 *   - 200 concurrent users sustained
 *
 * Usage:
 *   k6 run --env BASE_URL=https://staging-api.prms.health.go.ke tests/load/load-test.js
 *   k6 run --env BASE_URL=... --env SCENARIO=spike tests/load/load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ─── Custom metrics ───────────────────────────────────────────────────────────

const authErrors      = new Counter('auth_errors');
const referralErrors  = new Counter('referral_errors');
const errorRate       = new Rate('error_rate');
const loginDuration   = new Trend('login_duration', true);
const referralGetDur  = new Trend('referral_get_duration', true);
const referralPostDur = new Trend('referral_post_duration', true);

// ─── Test data ────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'load';

// Pre-seeded test users (created by seed script before load test)
const TEST_USERS = new SharedArray('users', function () {
  return [
    { email: 'loadtest.clinician1@test.com', password: 'Test@1234!', hospitalId: 1 },
    { email: 'loadtest.clinician2@test.com', password: 'Test@1234!', hospitalId: 1 },
    { email: 'loadtest.clinician3@test.com', password: 'Test@1234!', hospitalId: 2 },
    { email: 'loadtest.receptionist1@test.com', password: 'Test@1234!', hospitalId: 1 },
    { email: 'loadtest.admin@test.com', password: 'Test@1234!', hospitalId: 1 },
  ];
});

// ─── Scenario definitions ─────────────────────────────────────────────────────

const scenarios = {
  // Baseline load — 50 concurrent users, 5 minutes
  load: {
    scenarios: {
      constant_load: {
        executor: 'constant-vus',
        vus: 50,
        duration: '5m',
      },
    },
  },

  // Stress test — ramp up to 200 users
  stress: {
    scenarios: {
      ramping_load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '2m', target: 50  },   // warm up
          { duration: '3m', target: 100 },   // normal load
          { duration: '3m', target: 200 },   // stress
          { duration: '2m', target: 200 },   // sustain
          { duration: '2m', target: 0   },   // ramp down
        ],
      },
    },
  },

  // Spike test — sudden burst
  spike: {
    scenarios: {
      spike: {
        executor: 'ramping-vus',
        startVUs: 10,
        stages: [
          { duration: '30s', target: 10  },
          { duration: '10s', target: 300 },  // spike
          { duration: '1m',  target: 300 },  // sustain spike
          { duration: '10s', target: 10  },  // drop
          { duration: '30s', target: 10  },  // recover
        ],
      },
    },
  },

  // Soak test — low load, long duration (memory leaks, connection exhaustion)
  soak: {
    scenarios: {
      soak: {
        executor: 'constant-vus',
        vus: 30,
        duration: '30m',
      },
    },
  },
};

// ─── Thresholds — Architecture Contract §15.4 ────────────────────────────────

export const options = {
  ...scenarios[SCENARIO] || scenarios.load,
  thresholds: {
    // Global response time p95 < 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Error rate < 1%
    error_rate: ['rate<0.01'],
    // Specific endpoint thresholds
    login_duration:         ['p(95)<800'],
    referral_get_duration:  ['p(95)<300'],
    referral_post_duration: ['p(95)<600'],
    // All requests must complete
    http_req_failed: ['rate<0.01'],
  },
};

// ─── Login helper ─────────────────────────────────────────────────────────────

function doLogin(user: { email: string; password: string }): string | null {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login status 200':   (r) => r.status === 200,
    'has accessToken':    (r) => {
      try {
        const b = JSON.parse(r.body as string) as { data?: { accessToken?: string } };
        return !!b.data?.accessToken;
      } catch { return false; }
    },
  });

  if (!ok) {
    authErrors.add(1);
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  const body = JSON.parse(res.body as string) as { data: { accessToken: string } };
  return body.data.accessToken;
}

// ─── Main VU function ─────────────────────────────────────────────────────────

export default function (): void {
  // Each VU picks a random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // ── Scenario 1: Auth flow ──────────────────────────────────────────────────
  let token: string | null = null;
  group('Auth', () => {
    token = doLogin(user);
  });

  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // ── Scenario 2: List referrals (paginated) ────────────────────────────────
  group('Referrals — list', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/referrals?page=1&limit=20`, { headers });
    referralGetDur.add(Date.now() - start);

    const ok = check(res, {
      'list status 200':     (r) => r.status === 200,
      'has pagination meta': (r) => {
        try {
          const b = JSON.parse(r.body as string) as { meta?: { pagination?: unknown } };
          return !!b.meta?.pagination;
        } catch { return false; }
      },
    });
    if (!ok) { referralErrors.add(1); errorRate.add(1); } else { errorRate.add(0); }
  });

  sleep(0.5);

  // ── Scenario 3: Get single referral ──────────────────────────────────────
  group('Referrals — get by ID', () => {
    const start = Date.now();
    // Use ID 1 — assumes pre-seeded referral exists
    const res = http.get(`${BASE_URL}/api/v1/referrals/1`, { headers });
    referralGetDur.add(Date.now() - start);

    check(res, {
      'get referral 200 or 404': (r) => [200, 404].includes(r.status),
    });
    errorRate.add(res.status >= 500 ? 1 : 0);
  });

  sleep(0.5);

  // ── Scenario 4: Health check ──────────────────────────────────────────────
  group('Health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200 ? 1 : 0);
  });

  sleep(1);
}

// ─── Setup: seed load test users ─────────────────────────────────────────────

export function setup(): void {
  // Verify the API is reachable before starting
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API not reachable at ${BASE_URL} — got HTTP ${res.status}`);
  }
  console.log(`✅ API reachable at ${BASE_URL} — starting ${SCENARIO} test`);
}

// ─── Teardown: print summary ──────────────────────────────────────────────────

export function teardown(): void {
  console.log('Load test complete. Check k6 summary above for threshold results.');
}
