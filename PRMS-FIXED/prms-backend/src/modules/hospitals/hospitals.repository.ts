/**
 * Hospitals Repository
 *
 * Architecture Contract §9.2 — all SQL lives here, no SQL in Services.
 * All queries use prepared statements via mysql2 execute().
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import type { IPaginationParams } from '../../shared/pagination.helper.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IHospitalRow extends mysql.RowDataPacket {
  id: number;
  moh_code: string;
  name: string;
  facility_level: 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6';
  county: string;
  sub_county: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'Pending' | 'Approved' | 'Suspended';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface IHospitalApprovalRow extends mysql.RowDataPacket {
  id: number;
  hospital_id: number;
  actioned_by: number | null;
  previous_status: 'Pending' | 'Approved' | 'Suspended';
  new_status: 'Pending' | 'Approved' | 'Suspended';
  reason: string | null;
  actioned_at: Date;
  // joined
  actioned_by_username?: string;
  hospital_name?: string;
}

export interface ICreateHospitalData {
  mohCode: string;
  name: string;
  facilityLevel: 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6';
  county: string;
  subCounty: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface IUpdateHospitalData {
  name?: string;
  facilityLevel?: 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6';
  county?: string;
  subCounty?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class HospitalRepository extends BaseRepository {
  protected readonly moduleName = 'hospitals';

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: number): Promise<IHospitalRow | null> {
    return this.queryOne<IHospitalRow>(
      `SELECT * FROM hospitals WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
  }

  async findByIdOrFail(id: number): Promise<IHospitalRow> {
    return this.queryOneOrFail<IHospitalRow>(
      `SELECT * FROM hospitals WHERE id = ? AND deleted_at IS NULL`,
      [id],
      'Hospital',
    );
  }

  async findByMohCode(mohCode: string): Promise<IHospitalRow | null> {
    return this.queryOne<IHospitalRow>(
      `SELECT * FROM hospitals WHERE moh_code = ? AND deleted_at IS NULL`,
      [mohCode],
    );
  }

  async findAll(
    pagination: IPaginationParams,
    filters: { status?: string; county?: string; facilityLevel?: string; q?: string },
  ): Promise<IHospitalRow[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }
    if (filters.county) {
      conditions.push('county = ?');
      values.push(filters.county);
    }
    if (filters.facilityLevel) {
      conditions.push('facility_level = ?');
      values.push(filters.facilityLevel);
    }
    if (filters.q) {
      const likeValue = `%${filters.q}%`;
      conditions.push('(name LIKE ? OR moh_code LIKE ? OR county LIKE ? OR sub_county LIKE ?)');
      values.push(likeValue, likeValue, likeValue, likeValue);
    }

    const where = conditions.join(' AND ');
    const allowedSort = ['id', 'name', 'county', 'status', 'created_at'] as const;
    const sortCol = allowedSort.includes(pagination.sortBy as typeof allowedSort[number])
      ? pagination.sortBy!
      : 'created_at';
    const sortDir = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

    values.push(pagination.limit, pagination.offset);

    return this.query<IHospitalRow>(
      `SELECT * FROM hospitals WHERE ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      values,
    );
  }

  async countAll(filters: { status?: string; county?: string; facilityLevel?: string; q?: string }): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];

    if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }
    if (filters.county) { conditions.push('county = ?'); values.push(filters.county); }
    if (filters.facilityLevel) { conditions.push('facility_level = ?'); values.push(filters.facilityLevel); }
    if (filters.q) {
      const likeValue = `%${filters.q}%`;
      conditions.push('(name LIKE ? OR moh_code LIKE ? OR county LIKE ? OR sub_county LIKE ?)');
      values.push(likeValue, likeValue, likeValue, likeValue);
    }

    return this.count(`SELECT COUNT(*) AS total FROM hospitals WHERE ${conditions.join(' AND ')}`, values);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(data: ICreateHospitalData): Promise<number> {
    const result = await this.mutate(
      `INSERT INTO hospitals (moh_code, name, facility_level, county, sub_county, address, phone, email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [data.mohCode, data.name, data.facilityLevel, data.county, data.subCounty,
       data.address ?? null, data.phone ?? null, data.email ?? null],
    );
    return result.insertId;
  }

  async update(id: number, data: IUpdateHospitalData): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined)          { fields.push('name = ?');           values.push(data.name); }
    if (data.facilityLevel !== undefined) { fields.push('facility_level = ?'); values.push(data.facilityLevel); }
    if (data.county !== undefined)        { fields.push('county = ?');         values.push(data.county); }
    if (data.subCounty !== undefined)     { fields.push('sub_county = ?');     values.push(data.subCounty); }
    if (data.address !== undefined)       { fields.push('address = ?');        values.push(data.address); }
    if (data.phone !== undefined)         { fields.push('phone = ?');          values.push(data.phone); }
    if (data.email !== undefined)         { fields.push('email = ?');          values.push(data.email); }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await this.mutate(
      `UPDATE hospitals SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values,
    );
    return result.affectedRows > 0;
  }

  async updateStatus(
    id: number,
    status: 'Pending' | 'Approved' | 'Suspended',
  ): Promise<boolean> {
    const result = await this.mutate(
      `UPDATE hospitals SET status = ? WHERE id = ? AND deleted_at IS NULL`,
      [status, id],
    );
    return result.affectedRows > 0;
  }

  async softDelete(table: string, id: number): Promise<boolean> {
    return super.softDelete('hospitals', id);
  }

  // ── Approval trail ────────────────────────────────────────────────────────

  async createApprovalRecord(
    connection: mysql.PoolConnection,
    hospitalId: number,
    actionedBy: number | null,
    previousStatus: 'Pending' | 'Approved' | 'Suspended',
    newStatus: 'Pending' | 'Approved' | 'Suspended',
    reason: string | null,
  ): Promise<number> {
    const result = await this.mutateOnConnection(
      connection,
      `INSERT INTO hospital_approvals (hospital_id, actioned_by, previous_status, new_status, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [hospitalId, actionedBy, previousStatus, newStatus, reason],
    );
    return result.insertId;
  }

  async updateStatusInTransaction(
    connection: mysql.PoolConnection,
    id: number,
    status: 'Pending' | 'Approved' | 'Suspended',
  ): Promise<boolean> {
    const result = await this.mutateOnConnection(
      connection,
      `UPDATE hospitals SET status = ? WHERE id = ? AND deleted_at IS NULL`,
      [status, id],
    );
    return result.affectedRows > 0;
  }

  async findApprovalHistory(
    hospitalId: number,
    pagination: IPaginationParams,
  ): Promise<IHospitalApprovalRow[]> {
    return this.query<IHospitalApprovalRow>(
      `SELECT ha.*, u.username AS actioned_by_username, h.name AS hospital_name
       FROM hospital_approvals ha
       LEFT JOIN users u ON u.id = ha.actioned_by
       INNER JOIN hospitals h ON h.id = ha.hospital_id
       WHERE ha.hospital_id = ?
       ORDER BY ha.actioned_at DESC
       LIMIT ? OFFSET ?`,
      [hospitalId, pagination.limit, pagination.offset],
    );
  }

  async countApprovalHistory(hospitalId: number): Promise<number> {
    return this.count(
      `SELECT COUNT(*) AS total FROM hospital_approvals WHERE hospital_id = ?`,
      [hospitalId],
    );
  }
}
