import 'dotenv/config'; // Load .env before any other import — must be first
import bcrypt from 'bcrypt';
import { getPrimaryPool, verifyDatabaseConnection, closeDatabasePool } from '../../config/database.config.js';
import { logger } from '../../config/logger.config.js';
import { env } from '../../config/env.config.js';
import { encrypt } from '../../shared/services/crypto.service.js';

interface ISeedHospital {
  mohCode: string;
  name: string;
  facilityLevel: 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6';
  county: string;
  subCounty: string;
  phone: string;
  email: string;
}

const SEED_HOSPITALS: ISeedHospital[] = [
  {
    mohCode: 'MOH-001',
    name: 'Kenyatta National Hospital',
    facilityLevel: 'Level 6',
    county: 'Nairobi',
    subCounty: 'Dagoretti North',
    phone: '+254202726300',
    email: 'info@knh.or.ke',
  },
  {
    mohCode: 'MOH-002',
    name: 'Nakuru County Referral Hospital',
    facilityLevel: 'Level 5',
    county: 'Nakuru',
    subCounty: 'Nakuru Town East',
    phone: '+254512216000',
    email: 'info@nakuruhospital.go.ke',
  },
];

const SEED_PASSWORD = 'PaschalMe123!'; 

async function seedSystemAdmin(): Promise<void> {
  const pool = getPrimaryPool();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, env.BCRYPT_ROUNDS);
  const fullName = 'System Administrator';

  await pool.execute(
    `INSERT INTO users (
       hospital_id, username, email, password_hash, role,
       full_name_encrypted, status
     ) VALUES (NULL, ?, ?, ?, 'System Admin', ?, 'Active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    ['admin', 'admin@prms.local', passwordHash, encrypt(fullName)],
  );

  logger.info('Seeded System Admin (username: admin)', { module: 'seed' });
}

async function seedHospital(h: ISeedHospital): Promise<number> {
  const pool = getPrimaryPool();

  await pool.execute(
    `INSERT INTO hospitals (
       moh_code, name, facility_level, county, sub_county, phone, email, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [h.mohCode, h.name, h.facilityLevel, h.county, h.subCounty, h.phone, h.email],
  );

  const [rows] = await pool.execute<import('mysql2/promise').RowDataPacket[]>(
    `SELECT id FROM hospitals WHERE moh_code = ?`,
    [h.mohCode],
  );
  const hospitalId = rows[0]!.id as number;

  logger.info(`Seeded hospital: ${h.name} (id=${hospitalId})`, { module: 'seed' });
  return hospitalId;
}

async function seedStaffUser(
  hospitalId: number,
  role: 'Hospital Admin' | 'Clinician' | 'Receptionist',
  usernameSuffix: string,
  fullName: string,
  phone: string,
): Promise<void> {
  const pool = getPrimaryPool();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, env.BCRYPT_ROUNDS);
  const username = `${usernameSuffix}.h${hospitalId}`;
  const email = `${username}@prms.local`;

  await pool.execute(
    `INSERT INTO users (
       hospital_id, username, email, password_hash, role,
       full_name_encrypted, phone_number, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [hospitalId, username, email, passwordHash, role, encrypt(fullName), phone],
  );

  logger.info(`Seeded ${role}: ${username}`, { module: 'seed' });
}

async function run(): Promise<void> {
  logger.info('Starting database seed', { module: 'seed' });
  await verifyDatabaseConnection();

  try {
    await seedSystemAdmin();

    for (const h of SEED_HOSPITALS) {
      const hospitalId = await seedHospital(h);
      await seedStaffUser(hospitalId, 'Hospital Admin', 'hadmin', `${h.name} Hospital Admin`, h.phone);
      await seedStaffUser(hospitalId, 'Clinician', 'clinician', `${h.name} Clinician`, h.phone);
      await seedStaffUser(hospitalId, 'Receptionist', 'receptionist', `${h.name} Receptionist`, h.phone);
    }

    logger.info('Database seed completed successfully', { module: 'seed' });
    logger.info(`All seeded accounts use password: ${SEED_PASSWORD} — change before production use`, {
      module: 'seed',
    });
  } finally {
    await closeDatabasePool();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seed failed', {
      module: 'seed',
      errorMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  });