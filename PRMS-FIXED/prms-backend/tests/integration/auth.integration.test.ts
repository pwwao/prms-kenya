/**
 * Integration Tests — Auth API
 * Tests: POST /api/v1/auth/login, /verify-2fa, /refresh, /logout
 * Uses real MySQL + Redis (test containers or CI services)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import {
  getTestPool,
  closeTestPool,
  getTestRedis,
  closeTestRedis,
  flushTestRedis,
  truncateAll,
  seedHospital,
  seedUser,
  issueTestToken,
} from '../helpers/test-infrastructure.js';

// Create the Express app once for the suite
let app: Express.Application;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  // Dynamic import to allow env injection before module load
  const { createApp } = await import('../../src/app.js');
  app = createApp();
  request = supertest(app);
});

afterAll(async () => {
  await closeTestPool();
  await closeTestRedis();
});

beforeEach(async () => {
  await truncateAll();
  await flushTestRedis();
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 400 when body is missing', async () => {
    const res = await request.post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is invalid format', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Test@1234!' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { field: string }) => d.field === 'email')).toBe(true);
  });

  it('returns 401 when credentials are wrong', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: 'doc@test.com' });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'doc@test.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('returns 401 for suspended account', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: 'suspended@test.com', status: 'Suspended' });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@test.com', password: 'Test@1234!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_ACCOUNT_SUSPENDED');
  });

  it('returns 200 with token pair on valid credentials (no 2FA)', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: 'active@test.com', twoFaEnabled: false });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'active@test.com', password: 'Test@1234!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.accessExpiresIn).toBe(900);
  });

  it('returns 200 with preAuthToken when 2FA is enabled', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: '2fa@test.com', twoFaEnabled: true });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: '2fa@test.com', password: 'Test@1234!' });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFa).toBe(true);
    expect(res.body.data).toHaveProperty('preAuthToken');
    expect(res.body.data).not.toHaveProperty('accessToken');
  });

  it('returns standard envelope on success', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: 'envelope@test.com' });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'envelope@test.com', password: 'Test@1234!' });

    expect(res.body).toMatchObject({
      success: true,
      meta: expect.objectContaining({
        timestamp: expect.any(String),
        requestId: expect.any(String),
      }),
    });
  });
});

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const res = await request.post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request.post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });

  it('returns 204 and blacklists token on valid logout', async () => {
    const hospitalId = await seedHospital();
    const { id: userId } = await seedUser({ hospitalId });
    const token = issueTestToken({ userId, role: 'Clinician', hospitalId });

    const res = await request
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    // Verify token is now blacklisted
    const retryRes = await request
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(retryRes.status).toBe(401);
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('Auth rate limiting', () => {
  it('returns 429 after 5 failed login attempts', async () => {
    const hospitalId = await seedHospital();
    await seedUser({ hospitalId, email: 'ratelimit@test.com' });

    for (let i = 0; i < 5; i++) {
      await request
        .post('/api/v1/auth/login')
        .send({ email: 'ratelimit@test.com', password: 'Wrong!' });
    }

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'ratelimit@test.com', password: 'Wrong!' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
