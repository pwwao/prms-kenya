#!/usr/bin/env tsx
/**
 * Load Test Seed Script
 * Creates hospitals and users required by k6 load tests.
 * Run BEFORE k6: npx tsx tests/load/seed-load-test.ts
 *
 * Architecture Contract §14.4 — test data isolation
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME     ?? 'prms_db',
  user:     process.env.DB_USER     ?? 'prms_user',
  password: process.env.DB_PASSWORD ?? '',
  connectionLimit: 5,
  charset: 'utf8mb4',
});

const PASSWORD_HASH = await bcrypt.hash('Test@1234!', 10);

// Placeholder encrypted values for non-PII-critical load test users
const FAKE_ENCRYPTED = JSON.stringify({ iv: 'a'.repeat(24), authTag: 'b'.repeat(32), content: 'c'.repeat(32) });
const FAKE_HASH      = 'a'.repeat(64);

async function upsertHospital(mflCode: string, name: string): Promise<number> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM hospitals WHERE mfl_code = ?', [mflCode],
  );
  if (rows.length > 0) {
    console.log(`  Hospital exists: ${name} (id=${rows[0]!.id})`);
    return rows[0]!.id as number;
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO hospitals
       (name, mfl_code, hospital_type, status, county, sub_county, phone, email, address)
     VALUES (?, ?, 'National Referral Hospital', 'Active', 'Nairobi', 'Westlands', ?, ?, 'P.O Box 1, Nairobi')`,
    [name, mflCode, '+254700000001', `${mflCode.toLowerCase()}@loadtest.com`],
  );
  console.log(`  Created hospital: ${name} (id=${result.insertId})`);
  return result.insertId;
}

async function upsertUser(
  hospitalId: number,
  email: string,
  role: string,
): Promise<number> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM users WHERE email = ?', [email],
  );
  if (rows.length > 0) {
    console.log(`  User exists: ${email} (id=${rows[0]!.id})`);
    return rows[0]!.id as number;
  }
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users
       (hospital_id, role, email, password_hash, full_name, full_name_hash, status, two_fa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 'Active', 0)`,
    [hospitalId, role, email, PASSWORD_HASH, FAKE_ENCRYPTED, FAKE_HASH],
  );
  console.log(`  Created user: ${email} role=${role} (id=${result.insertId})`);
  return result.insertId;
}

async function upsertPatient(hospitalId: number): Promise<number> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM patients WHERE hospital_id = ? AND national_id_hash = ? LIMIT 1',
    [hospitalId, FAKE_HASH],
  );
  if (rows.length > 0) return rows[0]!.id as number;

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO patients
       (hospital_id, national_id, national_id_hash, full_name, full_name_hash,
        date_of_birth, gender, phone, phone_hash, county_of_residence)
     VALUES (?, ?, ?, ?, ?, '1990-01-01', 'Male', ?, ?, 'Nairobi')`,
    [hospitalId, FAKE_ENCRYPTED, FAKE_HASH, FAKE_ENCRYPTED, FAKE_HASH, FAKE_ENCRYPTED, FAKE_HASH],
  );
  console.log(`  Created patient (id=${result.insertId})`);
  return result.insertId;
}

async function seedReferral(
  patientId: number,
  srcHospitalId: number,
  tgtHospitalId: number,
  clinicianId: number,
): Promise<void> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM referrals WHERE source_hospital_id = ? AND patient_id = ?',
    [srcHospitalId, patientId],
  );
  if ((rows[0]!.cnt as number) >= 5) {
    console.log('  Referrals already seeded');
    return;
  }
  for (let i = 0; i < 5; i++) {
    await pool.execute(
      `INSERT INTO referrals
         (patient_id, source_hospital_id, target_hospital_id, referring_clinician_id,
          status, urgency_level, referral_type, clinical_notes, diagnosis)
       VALUES (?, ?, ?, ?, 'Submitted', 'Urgent', 'Inpatient', ?, ?)`,
      [patientId, srcHospitalId, tgtHospitalId, clinicianId, FAKE_ENCRYPTED, FAKE_ENCRYPTED],
    );
  }
  console.log('  Created 5 seed referrals');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('🌱 Seeding load test data...');

console.log('\nHospitals:');
const h1 = await upsertHospital('LTMFL001', 'Load Test Hospital 1');
const h2 = await upsertHospital('LTMFL002', 'Load Test Hospital 2');

console.log('\nUsers:');
const c1 = await upsertUser(h1, 'loadtest.clinician1@test.com',    'Clinician');
         await upsertUser(h1, 'loadtest.clinician2@test.com',    'Clinician');
         await upsertUser(h2, 'loadtest.clinician3@test.com',    'Clinician');
         await upsertUser(h1, 'loadtest.receptionist1@test.com', 'Receptionist');
         await upsertUser(h1, 'loadtest.admin@test.com',         'Hospital Admin');

console.log('\nPatients:');
const p1 = await upsertPatient(h1);

console.log('\nReferrals:');
await seedReferral(p1, h1, h2, c1);

await pool.end();
console.log('\n✅ Load test seed complete.');
console.log('   Run: k6 run --env BASE_URL=http://localhost:3000 tests/load/load-test.ts');
