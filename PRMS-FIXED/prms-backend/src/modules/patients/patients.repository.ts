/**
 * Patients Repository
 * Architecture Contract §9.2 — SQL only here.
 * Module 9: PII stored as AES-256-GCM ciphertext; searches via HMAC blind index.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import type { IPaginationParams } from '../../shared/pagination.helper.js';
import {
  hashFullName,
  hashNationalId,
  hashPhone,
  normaliseFullName,
  normaliseNationalId,
  normalisePhone,
} from '../../shared/services/hash.service.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IPatientRow extends mysql.RowDataPacket {
  id: number;
  national_id_encrypted: string | null;
  national_id_hash: string | null;
  full_name_encrypted: string;
  full_name_hash: string | null;
  phone_encrypted: string | null;
  phone_hash: string | null;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  date_of_birth: string;  // DATE returned as string from mysql2
  county: string;
  sub_county: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  registered_by_user_id: number;
  registered_at_hospital_id: number;
  created_at: Date;
  updated_at: Date;
  // joined fields (optional)
  registered_by_username?: string;
  registered_at_hospital_name?: string;
}

export interface ICreatePatientData {
  nationalIdEncrypted: string | null;
  nationalIdHash: string | null;
  fullNameEncrypted: string;
  fullNameHash: string | null;
  phoneEncrypted: string | null;
  phoneHash: string | null;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth: string;
  county: string;
  subCounty?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  registeredByUserId: number;
  registeredAtHospitalId: number;
}

export interface IUpdatePatientData {
  fullNameEncrypted?: string;
  fullNameHash?: string;
  phoneEncrypted?: string | null;
  phoneHash?: string | null;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth?: string;
  county?: string;
  subCounty?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PatientRepository extends BaseRepository {
  protected readonly moduleName = 'patients';

  private readonly SELECT_COLS = `
    p.*,
    u.username AS registered_by_username,
    h.name     AS registered_at_hospital_name
  `;

  private readonly BASE_JOIN = `
    FROM patients p
    INNER JOIN users u     ON u.id = p.registered_by_user_id
    INNER JOIN hospitals h ON h.id = p.registered_at_hospital_id
  `;

  async findById(id: number): Promise<IPatientRow | null> {
    return this.queryOne<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE p.id = ?`,
      [id],
    );
  }

  async findByIdOrFail(id: number): Promise<IPatientRow> {
    return this.queryOneOrFail<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE p.id = ?`,
      [id],
      'Patient',
    );
  }

  /** Blind-index lookup by hashed national ID — O(1) indexed search */
  async findByNationalIdHash(hash: string): Promise<IPatientRow | null> {
    return this.queryOne<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE p.national_id_hash = ?`,
      [hash],
    );
  }

  /** Blind-index lookup by hashed phone — returns multiple (phone may not be unique) */
  async findByPhoneHash(hash: string): Promise<IPatientRow[]> {
    return this.query<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE p.phone_hash = ?`,
      [hash],
    );
  }

  /** Blind-index lookup by hashed full name */
  async findByFullNameHash(hash: string, pagination: IPaginationParams): Promise<IPatientRow[]> {
    return this.query<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN}
       WHERE p.full_name_hash = ?
       LIMIT ? OFFSET ?`,
      [hash, pagination.limit, pagination.offset],
    );
  }

  async findAll(
    pagination: IPaginationParams,
    filters: { hospitalId?: number; county?: string; gender?: string; q?: string },
  ): Promise<IPatientRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.hospitalId !== undefined) {
      conditions.push('p.registered_at_hospital_id = ?');
      values.push(filters.hospitalId);
    }
    if (filters.county) {
      conditions.push('p.county = ?');
      values.push(filters.county);
    }
    if (filters.gender) {
      conditions.push('p.gender = ?');
      values.push(filters.gender);
    }
    if (filters.q) {
      const query = filters.q.trim();
      if (/^\d{7,8}$/.test(query)) {
        conditions.push('p.national_id_hash = ?');
        values.push(hashNationalId(normaliseNationalId(query)));
      } else if (/^(?:\+254|0)[17]\d{8}$/.test(query)) {
        conditions.push('p.phone_hash = ?');
        values.push(hashPhone(normalisePhone(query)));
      } else {
        conditions.push('p.full_name_hash = ?');
        values.push(hashFullName(normaliseFullName(query)));
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowed = ['id', 'county', 'gender', 'date_of_birth', 'created_at'] as const;
    const sortCol = allowed.includes(pagination.sortBy as typeof allowed[number])
      ? `p.${pagination.sortBy!}`
      : 'p.created_at';
    const sortDir = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

    values.push(pagination.limit, pagination.offset);

    return this.query<IPatientRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} ${where}
       ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      values,
    );
  }

  async countAll(filters: { hospitalId?: number; county?: string; gender?: string; q?: string }): Promise<number> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.hospitalId !== undefined) { conditions.push('registered_at_hospital_id = ?'); values.push(filters.hospitalId); }
    if (filters.county) { conditions.push('county = ?'); values.push(filters.county); }
    if (filters.gender) { conditions.push('gender = ?'); values.push(filters.gender); }
    if (filters.q) {
      const query = filters.q.trim();
      if (/^\d{7,8}$/.test(query)) {
        conditions.push('national_id_hash = ?');
        values.push(hashNationalId(normaliseNationalId(query)));
      } else if (/^(?:\+254|0)[17]\d{8}$/.test(query)) {
        conditions.push('phone_hash = ?');
        values.push(hashPhone(normalisePhone(query)));
      } else {
        conditions.push('full_name_hash = ?');
        values.push(hashFullName(normaliseFullName(query)));
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.count(`SELECT COUNT(*) AS total FROM patients p ${where}`, values);
  }

  async create(data: ICreatePatientData): Promise<number> {
    const result = await this.mutate(
      `INSERT INTO patients (
         national_id_encrypted, national_id_hash,
         full_name_encrypted,   full_name_hash,
         phone_encrypted,       phone_hash,
         gender, date_of_birth, county, sub_county,
         next_of_kin_name, next_of_kin_phone,
         registered_by_user_id, registered_at_hospital_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nationalIdEncrypted, data.nationalIdHash,
        data.fullNameEncrypted,   data.fullNameHash,
        data.phoneEncrypted,      data.phoneHash,
        data.gender, data.dateOfBirth, data.county, data.subCounty ?? null,
        data.nextOfKinName ?? null, data.nextOfKinPhone ?? null,
        data.registeredByUserId, data.registeredAtHospitalId,
      ],
    );
    return result.insertId;
  }

  async update(id: number, data: IUpdatePatientData): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.fullNameEncrypted !== undefined) { fields.push('full_name_encrypted = ?'); values.push(data.fullNameEncrypted); }
    if (data.fullNameHash !== undefined)      { fields.push('full_name_hash = ?');      values.push(data.fullNameHash); }
    if (data.phoneEncrypted !== undefined)    { fields.push('phone_encrypted = ?');     values.push(data.phoneEncrypted); }
    if (data.phoneHash !== undefined)         { fields.push('phone_hash = ?');          values.push(data.phoneHash); }
    if (data.gender !== undefined)            { fields.push('gender = ?');              values.push(data.gender); }
    if (data.dateOfBirth !== undefined)       { fields.push('date_of_birth = ?');       values.push(data.dateOfBirth); }
    if (data.county !== undefined)            { fields.push('county = ?');              values.push(data.county); }
    if (data.subCounty !== undefined)         { fields.push('sub_county = ?');          values.push(data.subCounty); }
    if (data.nextOfKinName !== undefined)     { fields.push('next_of_kin_name = ?');    values.push(data.nextOfKinName); }
    if (data.nextOfKinPhone !== undefined)    { fields.push('next_of_kin_phone = ?');   values.push(data.nextOfKinPhone); }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await this.mutate(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return result.affectedRows > 0;
  }

  /** Get referral history for a patient via stored procedure */
  async getReferralHistory(patientId: number): Promise<mysql.RowDataPacket[]> {
    return this.query(
      `CALL sp_get_patient_referral_history(?)`,
      [patientId],
    );
  }

  // ── Sync — POST /api/v1/sync (Architecture Contract §13.3) ────────────────

  /**
   * Returns patients registered at this hospital who have been updated since
   * `since`. Joins via referrals so that patients in active referrals from
   * other hospitals are also included for destination-hospital staff.
   */
  async findForSync(hospitalId: number, since: Date): Promise<IPatientRow[]> {
    return this.query<IPatientRow>(
      `SELECT DISTINCT p.*
       FROM patients p
       LEFT JOIN referrals r
         ON r.patient_id = p.id
        AND (r.source_hospital_id = ? OR r.destination_hospital_id = ?)
        AND r.deleted_at IS NULL
       WHERE (p.registered_at_hospital_id = ? OR r.id IS NOT NULL)
         AND p.updated_at > ?
       ORDER BY p.updated_at ASC
       LIMIT 200`,
      [hospitalId, hospitalId, hospitalId, since],
    );
  }
}
