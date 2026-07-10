/**
 * Users Repository
 * Architecture Contract §9.2 — all SQL here, no SQL in Services.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import type { IPaginationParams } from '../../shared/pagination.helper.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IUserRow extends mysql.RowDataPacket {
  id: number;
  hospital_id: number | null;
  username: string;
  email: string | null;
  password_hash: string;
  role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
  full_name_encrypted: string | null;
  phone_number: string | null;
  two_factor_secret: string | null;
  is_two_factor_enabled: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  last_login_at: Date | null;
  password_changed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ICreateUserData {
  hospitalId: number | null;
  username: string;
  email: string | null;
  passwordHash: string;
  role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
  fullNameEncrypted: string | null;
  phoneNumber?: string | null;
}

export interface IUpdateUserData {
  email?: string | null;
  fullNameEncrypted?: string | null;
  phoneNumber?: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class UserRepository extends BaseRepository {
  protected readonly moduleName = 'users';

  async findById(id: number): Promise<IUserRow | null> {
    return this.queryOne<IUserRow>(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
  }

  async findByIdOrFail(id: number): Promise<IUserRow> {
    return this.queryOneOrFail<IUserRow>(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id],
      'User',
    );
  }

  async findByEmail(email: string): Promise<IUserRow | null> {
    return this.queryOne<IUserRow>(
      `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`,
      [email],
    );
  }

  async findByUsername(username: string): Promise<IUserRow | null> {
    return this.queryOne<IUserRow>(
      `SELECT * FROM users WHERE username = ? AND deleted_at IS NULL`,
      [username],
    );
  }

  async findAll(
    pagination: IPaginationParams,
    filters: { hospitalId?: number; role?: string; status?: string },
  ): Promise<IUserRow[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];

    if (filters.hospitalId !== undefined) {
      conditions.push('hospital_id = ?');
      values.push(filters.hospitalId);
    }
    if (filters.role) {
      conditions.push('role = ?');
      values.push(filters.role);
    }
    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    const allowed = ['id', 'username', 'email', 'role', 'status', 'created_at'] as const;
    const sortCol = allowed.includes(pagination.sortBy as typeof allowed[number])
      ? pagination.sortBy!
      : 'created_at';
    const sortDir = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

    values.push(pagination.limit, pagination.offset);

    return this.query<IUserRow>(
      `SELECT * FROM users WHERE ${conditions.join(' AND ')}
       ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      values,
    );
  }

  async countAll(filters: { hospitalId?: number; role?: string; status?: string }): Promise<number> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];

    if (filters.hospitalId !== undefined) { conditions.push('hospital_id = ?'); values.push(filters.hospitalId); }
    if (filters.role)   { conditions.push('role = ?');   values.push(filters.role); }
    if (filters.status) { conditions.push('status = ?'); values.push(filters.status); }

    return this.count(`SELECT COUNT(*) AS total FROM users WHERE ${conditions.join(' AND ')}`, values);
  }

  async create(data: ICreateUserData): Promise<number> {
    const result = await this.mutate(
      `INSERT INTO users
         (hospital_id, username, email, password_hash, role, full_name_encrypted, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.hospitalId, data.username, data.email, data.passwordHash,
       data.role, data.fullNameEncrypted, data.phoneNumber ?? null],
    );
    return result.insertId;
  }

  async update(id: number, data: IUpdateUserData): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined)             { fields.push('email = ?');                values.push(data.email); }
    if (data.fullNameEncrypted !== undefined) { fields.push('full_name_encrypted = ?');  values.push(data.fullNameEncrypted); }
    if (data.phoneNumber !== undefined)       { fields.push('phone_number = ?');         values.push(data.phoneNumber); }
    if (data.status !== undefined)            { fields.push('status = ?');               values.push(data.status); }

    if (fields.length === 0) return false;

    values.push(id);
    const result = await this.mutate(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values,
    );
    return result.affectedRows > 0;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.mutate(
      `UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?`,
      [passwordHash, id],
    );
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.mutate(
      `UPDATE users SET last_login_at = NOW() WHERE id = ?`,
      [id],
    );
  }

  async updateStatus(id: number, status: 'Active' | 'Inactive' | 'Suspended'): Promise<boolean> {
    const result = await this.mutate(
      `UPDATE users SET status = ? WHERE id = ? AND deleted_at IS NULL`,
      [status, id],
    );
    return result.affectedRows > 0;
  }

  async softDelete(_table: string, id: number): Promise<boolean> {
    return super.softDelete('users', id);
  }

  async setTwoFactorSecret(id: number, secret: string): Promise<void> {
    await this.mutate(
      `UPDATE users SET two_factor_secret = ?, is_two_factor_enabled = 1 WHERE id = ?`,
      [secret, id],
    );
  }

  async disableTwoFactor(id: number): Promise<void> {
    await this.mutate(
      `UPDATE users SET two_factor_secret = NULL, is_two_factor_enabled = 0 WHERE id = ?`,
      [id],
    );
  }
}
