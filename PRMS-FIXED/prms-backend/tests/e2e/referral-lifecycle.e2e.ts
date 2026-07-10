/**
 * E2E Tests — Full Referral Lifecycle
 * Playwright API-mode tests (no browser — pure HTTP)
 * Tests the complete business flow end-to-end against a live environment
 *
 * Flow tested:
 *   1. Hospital Admin creates users
 *   2. Clinician registers patient
 *   3. Clinician creates and submits referral
 *   4. Receptionist at target hospital acknowledges
 *   5. Clinician at target accepts
 *   6. Patient transferred → Completed
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// ─── Shared state across test steps ──────────────────────────────────────────

interface ITestContext {
  srcHospitalId: number;
  tgtHospitalId: number;
  clinicianToken: string;
  tgtClinicianToken: string;
  receptionistToken: string;
  patientId: number;
  referralId: number;
}

const ctx: ITestContext = {} as ITestContext;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email, password },
  });
  const body = await res.json() as { data: { accessToken: string } };
  return body.data.accessToken;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe.serial('Full Referral Lifecycle', () => {

  test('Step 1: Admin logs in and retrieves hospital IDs', async ({ request }) => {
    const token = await login(
      request,
      process.env.E2E_ADMIN_EMAIL!,
      process.env.E2E_ADMIN_PASSWORD!,
    );

    const res = await request.get(`${BASE_URL}/api/v1/hospitals?limit=2`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);

    const body = await res.json() as { data: { id: number }[] };
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    ctx.srcHospitalId = body.data[0]!.id;
    ctx.tgtHospitalId = body.data[1]!.id;
  });

  test('Step 2: Clinician at source hospital logs in', async ({ request }) => {
    ctx.clinicianToken = await login(
      request,
      process.env.E2E_CLINICIAN_EMAIL!,
      process.env.E2E_CLINICIAN_PASSWORD!,
    );
    expect(typeof ctx.clinicianToken).toBe('string');
    expect(ctx.clinicianToken.split('.').length).toBe(3); // JWT format
  });

  test('Step 3: Clinician registers a patient', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/patients`, {
      headers: authHeaders(ctx.clinicianToken),
      data: {
        nationalId: `E2E${Date.now()}`.substring(0, 8),
        fullName: 'E2E Test Patient',
        dateOfBirth: '1985-03-20',
        gender: 'Male',
        phone: '+254711000001',
        countyOfResidence: 'Nairobi',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json() as { data: { id: number } };
    ctx.patientId = body.data.id;
    expect(ctx.patientId).toBeGreaterThan(0);
  });

  test('Step 4: Clinician creates a Draft referral', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/referrals`, {
      headers: authHeaders(ctx.clinicianToken),
      data: {
        patientId: ctx.patientId,
        targetHospitalId: ctx.tgtHospitalId,
        urgencyLevel: 'Urgent',
        referralType: 'Inpatient',
        clinicalNotes: 'Patient requires specialist cardiac care',
        diagnosis: 'Acute myocardial infarction',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json() as { data: { id: number; status: string } };
    ctx.referralId = body.data.id;
    expect(body.data.status).toBe('Draft');
  });

  test('Step 5: Clinician submits the referral', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.clinicianToken),
        data: { status: 'Submitted' },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('Submitted');
  });

  test('Step 6: Receptionist at target hospital acknowledges referral', async ({ request }) => {
    ctx.receptionistToken = await login(
      request,
      process.env.E2E_RECEPTIONIST_EMAIL!,
      process.env.E2E_RECEPTIONIST_PASSWORD!,
    );

    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.receptionistToken),
        data: { status: 'Acknowledged' },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('Acknowledged');
  });

  test('Step 7: Clinician at target hospital accepts referral', async ({ request }) => {
    ctx.tgtClinicianToken = await login(
      request,
      process.env.E2E_TARGET_CLINICIAN_EMAIL!,
      process.env.E2E_TARGET_CLINICIAN_PASSWORD!,
    );

    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.tgtClinicianToken),
        data: { status: 'Accepted', acceptanceNotes: 'Bed available in cardiac ward' },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('Accepted');
  });

  test('Step 8: Patient transferred', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.clinicianToken),
        data: { status: 'Patient Transferred' },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('Patient Transferred');
  });

  test('Step 9: Referral completed', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.tgtClinicianToken),
        data: { status: 'Completed', completionNotes: 'Patient treated and discharged' },
      },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('Completed');
  });

  test('Step 10: Completed referral cannot be modified (terminal state)', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/v1/referrals/${ctx.referralId}/status`,
      {
        headers: authHeaders(ctx.clinicianToken),
        data: { status: 'Cancelled' },
      },
    );

    expect(res.status()).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('RESOURCE_INVALID_STATE_TRANSITION');
  });

  test('Step 11: Audit log has entries for all transitions', async ({ request }) => {
    const adminToken = await login(
      request,
      process.env.E2E_ADMIN_EMAIL!,
      process.env.E2E_ADMIN_PASSWORD!,
    );

    const res = await request.get(
      `${BASE_URL}/api/v1/audit-logs?resourceType=referral&resourceId=${ctx.referralId}`,
      { headers: authHeaders(adminToken) },
    );

    expect(res.status()).toBe(200);
    const body = await res.json() as { meta: { pagination: { total: number } } };
    // At minimum: create, submit, acknowledge, accept, transfer, complete = 6
    expect(body.meta.pagination.total).toBeGreaterThanOrEqual(6);
  });
});

// ─── Security E2E tests ───────────────────────────────────────────────────────

test.describe('Security — API hardening', () => {
  test('All responses include security headers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`);
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['strict-transport-security']).toBeDefined();
  });

  test('CORS blocks unlisted origin', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/hospitals`, {
      headers: { Origin: 'https://evil.com' },
    });
    // Nginx/Express should not set ACAO for unlisted origin
    expect(res.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('X-Request-ID is echoed in response', async ({ request }) => {
    const myId = '550e8400-e29b-41d4-a716-446655440000';
    const res = await request.get(`${BASE_URL}/health`, {
      headers: { 'X-Request-ID': myId },
    });
    expect(res.headers()['x-request-id']).toBe(myId);
  });

  test('SQL injection in query param returns 400 not 500', async ({ request }) => {
    const token = await login(request, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
    const res = await request.get(
      `${BASE_URL}/api/v1/referrals?sortBy=status;DROP TABLE referrals--`,
      { headers: authHeaders(token) },
    );
    // safeSortBy strips the invalid column — returns 200 with default sort, not 500
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });
});
