/**
 * Integration Tests — Patient API
 * Tests: registration, search by national ID, PII masking by role
 * Architecture Contract §11 — Patient data, encryption, masking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import {
  closeTestPool, closeTestRedis, flushTestRedis,
  truncateAll, seedHospital, seedUser, issueTestToken,
} from '../helpers/test-infrastructure.js';

let app: Express.Application;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  const { createApp } = await import('../../src/app.js');
  app = createApp();
  request = supertest(app);
});

afterAll(async () => { await closeTestPool(); await closeTestRedis(); });
beforeEach(async () => { await truncateAll(); await flushTestRedis(); });

const validPatientPayload = {
  nationalId: '12345678',
  fullName: 'Jane Doe',
  dateOfBirth: '1990-05-15',
  gender: 'Female',
  phone: '+254722000001',
  countyOfResidence: 'Nairobi',
};

// ─── POST /api/v1/patients ────────────────────────────────────────────────────

describe('POST /api/v1/patients', () => {
  it('returns 401 without token', async () => {
    const res = await request.post('/api/v1/patients').send(validPatientPayload);
    expect(res.status).toBe(401);
  });

  it('returns 403 when Hospital Admin tries to register patient', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Hospital Admin', hospitalId });

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid national ID format', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPatientPayload, nationalId: '123' }); // too short

    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { field: string }) => d.field === 'nationalId')).toBe(true);
  });

  it('returns 400 for invalid Kenya phone number', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPatientPayload, phone: '0000000000' }); // invalid format

    expect(res.status).toBe(400);
  });

  it('returns 201 and creates patient as Clinician', async () => {
    const hospitalId = await seedHospital();
    const { id: userId } = await seedUser({ hospitalId, role: 'Clinician' });
    const token = issueTestToken({ userId, role: 'Clinician', hospitalId });

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });

  it('returns 201 and creates patient as Receptionist', async () => {
    const hospitalId = await seedHospital();
    const { id: userId } = await seedUser({ hospitalId, role: 'Receptionist' });
    const token = issueTestToken({ userId, role: 'Receptionist', hospitalId });

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    expect(res.status).toBe(201);
  });

  it('returns 409 on duplicate national ID', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    const res = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RESOURCE_ALREADY_EXISTS');
  });
});

// ─── PII masking by role ──────────────────────────────────────────────────────

describe('GET /api/v1/patients/:id — PII masking', () => {
  it('Clinician receives unmasked patient PII', async () => {
    const hospitalId = await seedHospital();
    const { id: userId } = await seedUser({ hospitalId, role: 'Clinician' });
    const token = issueTestToken({ userId, role: 'Clinician', hospitalId });

    const createRes = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    const patientId = createRes.body.data.id as number;

    const res = await request
      .get(`/api/v1/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Clinician sees full name
    expect(res.body.data.fullName).toBe('Jane Doe');
    expect(res.body.data.nationalId).toBe('12345678');
  });

  it('Receptionist receives masked patient PII', async () => {
    const hospitalId = await seedHospital();
    const { id: clinId } = await seedUser({ hospitalId, role: 'Clinician' });
    const { id: recepId } = await seedUser({ hospitalId, role: 'Receptionist' });

    const clinToken = issueTestToken({ userId: clinId, role: 'Clinician', hospitalId });
    const recepToken = issueTestToken({ userId: recepId, role: 'Receptionist', hospitalId });

    const createRes = await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${clinToken}`)
      .send(validPatientPayload);

    const patientId = createRes.body.data.id as number;

    const res = await request
      .get(`/api/v1/patients/${patientId}`)
      .set('Authorization', `Bearer ${recepToken}`);

    expect(res.status).toBe(200);
    // National ID should be masked (e.g. ****5678)
    expect(res.body.data.nationalId).toMatch(/^\*+\d{4}$/);
    // Full name partially masked
    expect(res.body.data.fullName).not.toBe('Jane Doe');
  });
});

// ─── GET /api/v1/patients/search ─────────────────────────────────────────────

describe('GET /api/v1/patients/search', () => {
  it('finds patient by national ID hash (blind index search)', async () => {
    const hospitalId = await seedHospital();
    const { id: userId } = await seedUser({ hospitalId, role: 'Clinician' });
    const token = issueTestToken({ userId, role: 'Clinician', hospitalId });

    await request
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(validPatientPayload);

    const res = await request
      .get('/api/v1/patients/search?nationalId=12345678')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown national ID', async () => {
    const hospitalId = await seedHospital();
    const token = issueTestToken({ role: 'Clinician', hospitalId });

    const res = await request
      .get('/api/v1/patients/search?nationalId=99999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
