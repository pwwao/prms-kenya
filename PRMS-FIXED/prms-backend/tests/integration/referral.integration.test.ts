/**
 * Integration Tests — Referral API
 * Tests: CRUD, state transitions, RBAC, facility isolation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import {
  closeTestPool,
  closeTestRedis,
  flushTestRedis,
  truncateAll,
  seedHospital,
  seedUser,
  seedPatient,
  seedReferral,
  issueTestToken,
} from '../helpers/test-infrastructure.js';

let app: Express.Application;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
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

// ─── POST /api/v1/referrals ───────────────────────────────────────────────────

describe('POST /api/v1/referrals', () => {
  it('returns 401 with no token', async () => {
    const res = await request.post('/api/v1/referrals').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 when Receptionist tries to create referral', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Receptionist', hospitalId });

    const res = await request
      .post('/api/v1/referrals')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetHospitalId: 2, patientId: 1, urgencyLevel: 'Urgent', referralType: 'Inpatient', clinicalNotes: 'test', diagnosis: 'Malaria' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
  });

  it('returns 400 on missing required fields', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    const res = await request
      .post('/api/v1/referrals')
      .set('Authorization', `Bearer ${token}`)
      .send({ urgencyLevel: 'Urgent' }); // missing patientId, targetHospitalId etc.

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('returns 201 and creates referral as Clinician', async () => {
    const srcHospital = await seedHospital({ name: 'Source Hospital', mflCode: 'MFL00001' });
    const tgtHospital = await seedHospital({ name: 'Target Hospital', mflCode: 'MFL00002' });
    const { id: clinicianId } = await seedUser({ hospitalId: srcHospital, role: 'Clinician' });
    const patientId = await seedPatient({ hospitalId: srcHospital });

    const token = issueTestToken({ userId: clinicianId, role: 'Clinician', hospitalId: srcHospital });

    const res = await request
      .post('/api/v1/referrals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId,
        targetHospitalId: tgtHospital,
        urgencyLevel: 'Urgent',
        referralType: 'Inpatient',
        clinicalNotes: 'Patient needs specialist care',
        diagnosis: 'Hypertensive crisis',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(typeof res.body.data.id).toBe('number');
  });
});

// ─── GET /api/v1/referrals/:id ────────────────────────────────────────────────

describe('GET /api/v1/referrals/:id', () => {
  it('returns 404 for non-existent referral', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    const res = await request
      .get('/api/v1/referrals/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when Clinician from different hospital accesses referral', async () => {
    const hospital1 = await seedHospital({ mflCode: 'MFL11111' });
    const hospital2 = await seedHospital({ mflCode: 'MFL22222' });
    const patientId = await seedPatient({ hospitalId: hospital1 });
    const referralId = await seedReferral({
      sourceHospitalId: hospital1,
      targetHospitalId: hospital2,
      patientId,
    });

    // Clinician from a THIRD hospital trying to access
    const hospital3 = await seedHospital({ mflCode: 'MFL33333' });
    const token = issueTestToken({ role: 'Clinician', hospitalId: hospital3 });

    const res = await request
      .get(`/api/v1/referrals/${referralId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns referral to Clinician at source hospital', async () => {
    const srcHospital = await seedHospital({ mflCode: 'MFL44444' });
    const tgtHospital = await seedHospital({ mflCode: 'MFL55555' });
    const { id: clinicianId } = await seedUser({ hospitalId: srcHospital, role: 'Clinician' });
    const patientId = await seedPatient({ hospitalId: srcHospital });
    const referralId = await seedReferral({
      sourceHospitalId: srcHospital,
      targetHospitalId: tgtHospital,
      patientId,
      createdBy: clinicianId,
    });

    const token = issueTestToken({ userId: clinicianId, role: 'Clinician', hospitalId: srcHospital });

    const res = await request
      .get(`/api/v1/referrals/${referralId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(referralId);
  });
});

// ─── PATCH /api/v1/referrals/:id/status ──────────────────────────────────────

describe('PATCH /api/v1/referrals/:id/status', () => {
  it('returns 422 on invalid state transition', async () => {
    const srcHospital = await seedHospital({ mflCode: 'MFL66666' });
    const tgtHospital = await seedHospital({ mflCode: 'MFL77777' });
    const { id: clinicianId } = await seedUser({ hospitalId: srcHospital });
    const patientId = await seedPatient({ hospitalId: srcHospital });
    const referralId = await seedReferral({
      sourceHospitalId: srcHospital,
      targetHospitalId: tgtHospital,
      patientId,
      status: 'Completed', // already terminal
    });

    const token = issueTestToken({ userId: clinicianId, role: 'Clinician', hospitalId: srcHospital });

    const res = await request
      .patch(`/api/v1/referrals/${referralId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RESOURCE_INVALID_STATE_TRANSITION');
  });
});

// ─── GET /api/v1/referrals — list with pagination ────────────────────────────

describe('GET /api/v1/referrals (list)', () => {
  it('returns paginated list scoped to hospital', async () => {
    const hospital = await seedHospital({ mflCode: 'MFL88888' });
    const otherHospital = await seedHospital({ mflCode: 'MFL99999' });
    const { id: clinicianId } = await seedUser({ hospitalId: hospital });
    const patientId = await seedPatient({ hospitalId: hospital });

    // Create 3 referrals for this hospital
    for (let i = 0; i < 3; i++) {
      await seedReferral({ sourceHospitalId: hospital, targetHospitalId: otherHospital, patientId });
    }
    // Create 1 referral for other hospital (should NOT appear)
    await seedReferral({ sourceHospitalId: otherHospital, targetHospitalId: hospital, patientId });

    const token = issueTestToken({ userId: clinicianId, role: 'Clinician', hospitalId: hospital });

    const res = await request
      .get('/api/v1/referrals?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toMatchObject({
      page: 1,
      limit: 20,
    });
    // Only hospital's referrals returned
    const ids: number[] = res.body.data.map((r: { source_hospital_id: number; target_hospital_id: number }) =>
      r.source_hospital_id === hospital || r.target_hospital_id === hospital
    );
    expect(ids.every(Boolean)).toBe(true);
  });

  it('System Admin sees all referrals', async () => {
    const h1 = await seedHospital({ mflCode: 'MFL11100' });
    const h2 = await seedHospital({ mflCode: 'MFL11200' });
    const p1 = await seedPatient({ hospitalId: h1 });
    await seedReferral({ sourceHospitalId: h1, targetHospitalId: h2, patientId: p1 });
    await seedReferral({ sourceHospitalId: h2, targetHospitalId: h1, patientId: p1 });

    const token = issueTestToken({ role: 'System Admin', hospitalId: null });
    const res = await request
      .get('/api/v1/referrals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(2);
  });
});
