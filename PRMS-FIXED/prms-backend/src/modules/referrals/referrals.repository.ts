/**
 * Referrals Repository — Modules 4, 5, 6
 * Architecture Contract §9.2 — all SQL here.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import type { IPaginationParams } from '../../shared/pagination.helper.js';
import type { TReferralStatus } from './referrals.state-machine.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IReferralRow extends mysql.RowDataPacket {
  id: number;
  referral_code: string;
  patient_id: number;
  source_hospital_id: number;
  destination_hospital_id: number;
  created_by_user_id: number;
  urgency_level: 'Routine' | 'Urgent' | 'Emergent';
  clinical_summary_encrypted: string | null;
  reason_for_referral: string;
  current_status: TReferralStatus;
  rejection_reason: string | null;
  received_by_user_id: number | null;
  accepted_rejected_by_user_id: number | null;
  dispatched_at: Date | null;
  received_at: Date | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // joined
  source_hospital_name?: string;
  destination_hospital_name?: string;
  created_by_username?: string;
}

export interface IReferralLogRow extends mysql.RowDataPacket {
  id: number;
  referral_id: number;
  action_by_user_id: number;
  previous_status: TReferralStatus | null;
  new_status: TReferralStatus;
  notes: string | null;
  ip_address: string | null;
  logged_at: Date;
  // joined
  action_by_username?: string;
}

export interface IAttachmentRow extends mysql.RowDataPacket {
  id: number;
  referral_id: number;
  uploaded_by_user_id: number;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  is_encrypted: number;
  created_at: Date;
  uploaded_by_username?: string;
}

export interface ICreateReferralData {
  patientId: number;
  sourceHospitalId: number;
  destinationHospitalId: number;
  createdByUserId: number;
  urgencyLevel: 'Routine' | 'Urgent' | 'Emergent';
  clinicalSummaryEncrypted: string | null;
  reasonForReferral: string;
}

export interface IUpdateReferralData {
  urgencyLevel?: 'Routine' | 'Urgent' | 'Emergent';
  clinicalSummaryEncrypted?: string | null;
  reasonForReferral?: string;
  destinationHospitalId?: number;
}

export interface ITransitionResult {
  success: boolean;
  errorMessage: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class ReferralRepository extends BaseRepository {
  protected readonly moduleName = 'referrals';

  private readonly SELECT_COLS = `
    r.*,
    hs.name AS source_hospital_name,
    hd.name AS destination_hospital_name,
    u.username AS created_by_username
  `;

  private readonly BASE_JOIN = `
    FROM referrals r
    INNER JOIN hospitals hs ON hs.id = r.source_hospital_id
    INNER JOIN hospitals hd ON hd.id = r.destination_hospital_id
    INNER JOIN users u      ON u.id  = r.created_by_user_id
  `;

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: number): Promise<IReferralRow | null> {
    return this.queryOne<IReferralRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE r.id = ?`,
      [id],
    );
  }

  async findByIdOrFail(id: number): Promise<IReferralRow> {
    return this.queryOneOrFail<IReferralRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE r.id = ?`,
      [id],
      'Referral',
    );
  }

  async findByCode(referralCode: string): Promise<IReferralRow | null> {
    return this.queryOne<IReferralRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} WHERE r.referral_code = ?`,
      [referralCode],
    );
  }

  async findAll(
    pagination: IPaginationParams,
    filters: {
      hospitalId?: number;
      hospitalRole?: 'source' | 'destination' | 'any';
      status?: TReferralStatus;
      urgencyLevel?: string;
      patientId?: number;
    },
  ): Promise<IReferralRow[]> {
    const conditions: string[] = [];
    const values: unknown[]    = [];

    if (filters.hospitalId !== undefined) {
      if (filters.hospitalRole === 'source') {
        conditions.push('r.source_hospital_id = ?');
        values.push(filters.hospitalId);
      } else if (filters.hospitalRole === 'destination') {
        conditions.push('r.destination_hospital_id = ?');
        values.push(filters.hospitalId);
      } else {
        conditions.push('(r.source_hospital_id = ? OR r.destination_hospital_id = ?)');
        values.push(filters.hospitalId, filters.hospitalId);
      }
    }
    if (filters.status)       { conditions.push('r.current_status = ?'); values.push(filters.status); }
    if (filters.urgencyLevel) { conditions.push('r.urgency_level = ?');  values.push(filters.urgencyLevel); }
    if (filters.patientId)    { conditions.push('r.patient_id = ?');     values.push(filters.patientId); }

    const where   = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowed = ['id', 'urgency_level', 'current_status', 'created_at', 'dispatched_at'] as const;
    const sortCol = allowed.includes(pagination.sortBy as typeof allowed[number])
      ? `r.${pagination.sortBy!}`
      : 'r.created_at';
    const sortDir = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

    values.push(pagination.limit, pagination.offset);
    return this.query<IReferralRow>(
      `SELECT ${this.SELECT_COLS} ${this.BASE_JOIN} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      values,
    );
  }

  async countAll(filters: {
    hospitalId?: number;
    hospitalRole?: 'source' | 'destination' | 'any';
    status?: TReferralStatus;
    urgencyLevel?: string;
    patientId?: number;
  }): Promise<number> {
    const conditions: string[] = [];
    const values: unknown[]    = [];

    if (filters.hospitalId !== undefined) {
      if (filters.hospitalRole === 'source') {
        conditions.push('source_hospital_id = ?'); values.push(filters.hospitalId);
      } else if (filters.hospitalRole === 'destination') {
        conditions.push('destination_hospital_id = ?'); values.push(filters.hospitalId);
      } else {
        conditions.push('(source_hospital_id = ? OR destination_hospital_id = ?)');
        values.push(filters.hospitalId, filters.hospitalId);
      }
    }
    if (filters.status)       { conditions.push('current_status = ?'); values.push(filters.status); }
    if (filters.urgencyLevel) { conditions.push('urgency_level = ?');  values.push(filters.urgencyLevel); }
    if (filters.patientId)    { conditions.push('patient_id = ?');     values.push(filters.patientId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.count(`SELECT COUNT(*) AS total FROM referrals r ${where}`, values);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(data: ICreateReferralData): Promise<number> {
    const result = await this.mutate(
      `INSERT INTO referrals
         (patient_id, source_hospital_id, destination_hospital_id, created_by_user_id,
          urgency_level, clinical_summary_encrypted, reason_for_referral, current_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
      [
        data.patientId, data.sourceHospitalId, data.destinationHospitalId,
        data.createdByUserId, data.urgencyLevel,
        data.clinicalSummaryEncrypted, data.reasonForReferral,
      ],
    );
    return result.insertId;
  }

  async update(id: number, data: IUpdateReferralData): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.urgencyLevel !== undefined) {
      fields.push('urgency_level = ?'); values.push(data.urgencyLevel);
    }
    if (data.clinicalSummaryEncrypted !== undefined) {
      fields.push('clinical_summary_encrypted = ?'); values.push(data.clinicalSummaryEncrypted);
    }
    if (data.reasonForReferral !== undefined) {
      fields.push('reason_for_referral = ?'); values.push(data.reasonForReferral);
    }
    if (data.destinationHospitalId !== undefined) {
      fields.push('destination_hospital_id = ?'); values.push(data.destinationHospitalId);
    }
    if (fields.length === 0) return false;

    values.push(id);
    const result = await this.mutate(
      `UPDATE referrals SET ${fields.join(', ')} WHERE id = ? AND current_status = 'Draft'`,
      values,
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.mutate(
      `DELETE FROM referrals WHERE id = ? AND current_status = 'Draft'`,
      [id],
    );
    return result.affectedRows > 0;
  }

  // ── State machine transition via stored procedure ─────────────────────────
  // Architecture Contract §2.3 — sp_transition_referral_status atomically
  // updates status and inserts referral_log in a single transaction.

  async transitionStatus(
    referralId: number,
    newStatus: string,
    actionByUserId: number,
    notes: string | null,
    rejectionReason: string | null,
    ipAddress: string | null,
  ): Promise<ITransitionResult> {
    interface SPOut extends mysql.RowDataPacket {
      p_success: number;
      p_error_message: string | null;
    }

    // Call the stored procedure and read OUT params
    await this.getPool().execute(
      `CALL sp_transition_referral_status(?, ?, ?, ?, ?, ?, @success, @error_msg)`,
      [referralId, newStatus, actionByUserId, notes, rejectionReason, ipAddress],
    );

    const outRows = await this.query<SPOut>(
      `SELECT @success AS p_success, @error_msg AS p_error_message`,
    );

    const row = outRows[0];
    return {
      success:      (row?.p_success ?? 0) === 1,
      errorMessage: row?.p_error_message ?? null,
    };
  }

  // ── Referral Timeline (Module 6) ──────────────────────────────────────────

  async findLogsByReferralId(referralId: number): Promise<IReferralLogRow[]> {
    return this.query<IReferralLogRow>(
      `SELECT rl.*, u.username AS action_by_username
       FROM referral_logs rl
       INNER JOIN users u ON u.id = rl.action_by_user_id
       WHERE rl.referral_id = ?
       ORDER BY rl.logged_at ASC`,
      [referralId],
    );
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  async createAttachment(
    referralId: number,
    uploadedByUserId: number,
    fileName: string,
    fileSizeBytes: number,
    mimeType: string,
    storagePath: string,
  ): Promise<number> {
    const result = await this.mutate(
      `INSERT INTO referral_attachments
         (referral_id, uploaded_by_user_id, file_name, file_size_bytes, mime_type, storage_path, is_encrypted)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [referralId, uploadedByUserId, fileName, fileSizeBytes, mimeType, storagePath],
    );
    return result.insertId;
  }

  async findAttachmentsByReferralId(referralId: number): Promise<IAttachmentRow[]> {
    return this.query<IAttachmentRow>(
      `SELECT ra.*, u.username AS uploaded_by_username
       FROM referral_attachments ra
       INNER JOIN users u ON u.id = ra.uploaded_by_user_id
       WHERE ra.referral_id = ?
       ORDER BY ra.created_at DESC`,
      [referralId],
    );
  }

  async deleteAttachment(attachmentId: number, referralId: number): Promise<boolean> {
    const result = await this.mutate(
      `DELETE FROM referral_attachments WHERE id = ? AND referral_id = ?`,
      [attachmentId, referralId],
    );
    return result.affectedRows > 0;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardCounts(hospitalId: number): Promise<mysql.RowDataPacket | null> {
    return this.queryOne(
      `CALL sp_get_referral_dashboard(?)`,
      [hospitalId],
    );
  }

  // ── Sync — POST /api/v1/sync (Architecture Contract §13.3) ────────────────

  /**
   * Returns referrals updated since `since` that the user is a participant in
   * (either source or destination hospital, per Architecture Contract §13.3).
   */
  async findForSync(hospitalId: number, since: Date): Promise<IReferralRow[]> {
    return this.query<IReferralRow>(
      `SELECT * FROM referrals
       WHERE (source_hospital_id = ? OR destination_hospital_id = ?)
         AND updated_at > ?
         AND deleted_at IS NULL
       ORDER BY updated_at ASC
       LIMIT 500`,
      [hospitalId, hospitalId, since],
    );
  }
}
