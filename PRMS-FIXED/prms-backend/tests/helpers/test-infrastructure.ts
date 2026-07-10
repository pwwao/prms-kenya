/**
 * Test Infrastructure — Shared fixtures, helpers, and test client
 * Used by unit, integration, and E2E test suites
 */

import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';
import express from 'express';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ─── Environment ─────────────────────────────────────────────────────────────

export const TEST_ENV = {
  DB_HOST:     process.env.DB_HOST     ?? 'localhost',
  DB_PORT:     Number(process.env.DB_PORT ?? 3306),
  DB_NAME:     process.env.DB_NAME     ?? 'prms_test',
  DB_USER:     process.env.DB_USER     ?? 'prms_test',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'prms_test',
  REDIS_HOST:  process.env.REDIS_HOST  ?? 'localhost',
  REDIS_PORT:  Number(process.env.REDIS_PORT ?? 6379),
  JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH ?? './keys/jwt.private.key',
  JWT_PUBLIC_KEY_PATH:  process.env.JWT_PUBLIC_KEY_PATH  ?? './keys/jwt.public.key',
  ENCRYPTION_KEY: process.env.DATABASE_ENCRYPTION_KEY ?? 'a'.repeat(64),
  HASH_SALT:      process.env.HASH_SALT ?? 'b'.repeat(64),
};

// ─── DB test pool ────────────────────────────────────────────────────────────

let testPool: mysql.Pool | null = null;

export function getTestPool(): mysql.Pool {
  if (!testPool) {
    testPool = mysql.createPool({
      host: TEST_ENV.DB_HOST,
      port: TEST_ENV.DB_PORT,
      database: TEST_ENV.DB_NAME,
      user: TEST_ENV.DB_USER,
      password: TEST_ENV.DB_PASSWORD,
      connectionLimit: 5,
      timezone: '+00:00',
      charset: 'utf8mb4',
    });
  }
  return testPool;
}

export async function closeTestPool(): Promise<void> {
  if (testPool) { await testPool.end(); testPool = null; }
}

// ─── Redis test client ────────────────────────────────────────────────────────

let testRedis: Redis | null = null;

export function getTestRedis(): Redis {
  if (!testRedis) {
    testRedis = new Redis({
      host: TEST_ENV.REDIS_HOST,
      port: TEST_ENV.REDIS_PORT,
      lazyConnect: false,
    });
  }
  return testRedis;
}

export async function closeTestRedis(): Promise<void> {
  if (testRedis) { await testRedis.quit(); testRedis = null; }
}

export async function flushTestRedis(): Promise<void> {
  await getTestRedis().flushdb();
}

// ─── DB cleanup helpers ───────────────────────────────────────────────────────

/** Truncates all tables in dependency-safe order and resets auto-increment. */
export async function truncateAll(): Promise<void> {
  const pool = getTestPool();
  const conn = await pool.getConnection();
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'audit_security_events', 'audit_logs', 'notifications',
      'messages', 'referral_documents', 'referral_status_history',
      'referrals', 'patients', 'users', 'hospitals',
    ];
    for (const t of tables) {
      await conn.execute(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

const PRIVATE_KEY = readFileSync(TEST_ENV.JWT_PRIVATE_KEY_PATH, 'utf-8');
const PUBLIC_KEY  = readFileSync(TEST_ENV.JWT_PUBLIC_KEY_PATH,  'utf-8');

export type TTestRole = 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';

export interface ITestTokenOptions {
  userId?: number;
  role?: TTestRole;
  hospitalId?: number | null;
  expiresIn?: number;
  jti?: string;
}

/** Issues a signed test JWT — bypasses Redis and the real token service. */
export function issueTestToken(opts: ITestTokenOptions = {}): string {
  return jwt.sign(
    {
      sub: String(opts.userId ?? 1),
      role: opts.role ?? 'Clinician',
      hospitalId: opts.hospitalId ?? 1,
      jti: opts.jti ?? uuidv4(),
    },
    PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: opts.expiresIn ?? 900,
      issuer: 'prms.health.go.ke',
      audience: 'prms-clients',
    },
  );
}

// ─── Test app factory ─────────────────────────────────────────────────────────

/** Creates a minimal Express app for route-level integration testing. */
export function createTestApp(): express.Express {
  // Dynamic import to avoid .env loading in tests
  const { createApp } = require('../src/app');
  return createApp() as express.Express;
}

// ─── Supertest client factory ─────────────────────────────────────────────────

export type TTestClient = supertest.SuperTest<supertest.Test>;

export function makeClient(app: express.Express): TTestClient {
  return supertest(app);
}

/** Returns an authenticated supertest agent with Bearer token. */
export function authenticatedClient(
  app: express.Express,
  tokenOpts: ITestTokenOptions = {},
): { client: TTestClient; token: string } {
  const token = issueTestToken(tokenOpts);
  const client = makeClient(app);
  return { client, token };
}

// ─── Seed factories ───────────────────────────────────────────────────────────

export interface ISeedHospitalOptions {
  name?: string;
  mflCode?: string;
  type?: string;
  status?: string;
  county?: string;
  subCounty?: string;
}

export async function seedHospital(opts: ISeedHospitalOptions = {}): Promise<number> {
  const pool = getTestPool();
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO hospitals
       (name, mfl_code, hospital_type, status, county, sub_county, phone, email, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.name       ?? 'Kenyatta National Hospital',
      opts.mflCode    ?? `MFL${Math.floor(Math.random() * 90000 + 10000)}`,
      opts.type       ?? 'National Referral Hospital',
      opts.status     ?? 'Active',
      opts.county     ?? 'Nairobi',
      opts.subCounty  ?? 'Westlands',
      '+254720000000',
      `hospital${Date.now()}@test.com`,
      'P.O Box 1, Nairobi',
    ],
  );
  return result.insertId;
}

export interface ISeedUserOptions {
  hospitalId?: number;
  role?: TTestRole;
  email?: string;
  status?: string;
  twoFaEnabled?: boolean;
}

export async function seedUser(opts: ISeedUserOptions = {}): Promise<{ id: number; password: string }> {
  const pool = getTestPool();
  const plainPassword = 'Test@1234!';
  const passwordHash = await bcrypt.hash(plainPassword, 4); // low rounds for test speed
  const encKey = Buffer.from(TEST_ENV.ENCRYPTION_KEY, 'hex');
  // Simplified encryption for seeds — tests use real crypto service via imports
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users
       (hospital_id, role, email, password_hash, full_name, full_name_hash, status, two_fa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.hospitalId    ?? 1,
      opts.role          ?? 'Clinician',
      opts.email         ?? `user_${Date.now()}@test.com`,
      passwordHash,
      '{"iv":"aabbcc","authTag":"ddeeff","content":"aabb"}', // placeholder encrypted name
      'a'.repeat(64),    // placeholder hash
      opts.status        ?? 'Active',
      opts.twoFaEnabled  ?? false,
    ],
  );
  return { id: result.insertId, password: plainPassword };
}

export interface ISeedPatientOptions {
  hospitalId?: number;
  nationalId?: string;
}

export async function seedPatient(opts: ISeedPatientOptions = {}): Promise<number> {
  const pool = getTestPool();
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO patients
       (hospital_id, national_id, national_id_hash, full_name, full_name_hash,
        date_of_birth, gender, phone, phone_hash, county_of_residence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.hospitalId ?? 1,
      '{"iv":"aa","authTag":"bb","content":"cc"}', // encrypted placeholder
      opts.nationalId ? 'a'.repeat(64) : 'b'.repeat(64),
      '{"iv":"aa","authTag":"bb","content":"cc"}',
      'c'.repeat(64),
      '1990-01-01',
      'Male',
      '{"iv":"aa","authTag":"bb","content":"cc"}',
      'd'.repeat(64),
      'Nairobi',
    ],
  );
  return result.insertId;
}

export interface ISeedReferralOptions {
  sourceHospitalId?: number;
  targetHospitalId?: number;
  patientId?: number;
  createdBy?: number;
  status?: string;
  urgencyLevel?: string;
}

export async function seedReferral(opts: ISeedReferralOptions = {}): Promise<number> {
  const pool = getTestPool();
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO referrals
       (patient_id, source_hospital_id, target_hospital_id, referring_clinician_id,
        status, urgency_level, referral_type, clinical_notes, diagnosis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.patientId         ?? 1,
      opts.sourceHospitalId  ?? 1,
      opts.targetHospitalId  ?? 2,
      opts.createdBy         ?? 1,
      opts.status            ?? 'Draft',
      opts.urgencyLevel      ?? 'Urgent',
      'Inpatient',
      '{"iv":"aa","authTag":"bb","content":"cc"}',
      '{"iv":"aa","authTag":"bb","content":"cc"}',
    ],
  );
  return result.insertId;
}
