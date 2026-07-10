/**
 * Referrals Service — Modules 4, 5, 6
 *
 * Module 4: Referral Management (CRUD, attachments)
 * Module 5: Referral Status Workflow (state machine enforcement)
 * Module 6: Referral Timeline (immutable audit log per referral)
 *
 * Architecture Contract §4.2 — business logic only, no SQL.
 * Architecture Contract §9.5 — clinical summary AES-256-GCM encrypted.
 * Architecture Contract §2.3 — transitions via sp_transition_referral_status.
 */

import { BaseService } from '../../shared/base.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  ReferralRepository,
  type IReferralRow,
  type IReferralLogRow,
  type IAttachmentRow,
  type ICreateReferralData,
} from './referrals.repository.js';
import { PatientRepository } from '../patients/patients.repository.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
} from '../../shared/errors/domain.errors.js';
import {
  validateTransition,
  getAvailableTransitions,
  describeTransition,
  isTerminalState,
  type TReferralStatus,
} from './referrals.state-machine.js';
import {
  encryptNullable,
  decryptNullable,
} from '../../shared/services/crypto.service.js';
import { buildPagination, type IPaginationParams } from '../../shared/pagination.helper.js';
import type { IPagination } from '../../shared/response.helper.js';
import type { TUserRole } from '../../config/jwt.config.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IReferralDTO {
  id: number;
  referralCode: string;
  patientId: number;
  sourceHospitalId: number;
  sourceHospitalName?: string;
  destinationHospitalId: number;
  destinationHospitalName?: string;
  createdByUserId: number;
  createdByUsername?: string;
  urgencyLevel: string;
  clinicalSummary: string | null;   // decrypted
  reasonForReferral: string;
  currentStatus: TReferralStatus;
  rejectionReason: string | null;
  availableTransitions: TReferralStatus[];
  receivedByUserId: number | null;
  acceptedRejectedByUserId: number | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReferralTimelineEntry {
  id: number;
  referralId: number;
  actionByUserId: number;
  actionByUsername?: string;
  previousStatus: TReferralStatus | null;
  newStatus: TReferralStatus;
  description: string;
  notes: string | null;
  loggedAt: Date;
}

export interface IAttachmentDTO {
  id: number;
  referralId: number;
  uploadedByUserId: number;
  uploadedByUsername?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  isEncrypted: boolean;
  createdAt: Date;
}

export interface ICreateReferralInput {
  patientId: number;
  destinationHospitalId: number;
  urgencyLevel: 'Routine' | 'Urgent' | 'Emergent';
  clinicalSummary?: string | null;
  reasonForReferral: string;
}

export interface IUpdateReferralInput {
  urgencyLevel?: 'Routine' | 'Urgent' | 'Emergent';
  clinicalSummary?: string | null;
  reasonForReferral?: string;
  destinationHospitalId?: number;
}

export interface ITransitionInput {
  newStatus: TReferralStatus;
  rejectionReason?: string | null;
  notes?: string | null;
  ipAddress?: string | null;
}

export interface IListReferralsResult {
  referrals: IReferralDTO[];
  pagination: IPagination;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReferralService extends BaseService {
  protected readonly moduleName = 'referrals';

  constructor(
    private readonly repo: ReferralRepository,
    private readonly patientRepo: PatientRepository,
    private readonly hospitalRepo: HospitalRepository,
    private readonly cache: CacheService,
  ) {
    super();
  }

  // ── Module 4: Create ──────────────────────────────────────────────────────

  async createReferral(
    input: ICreateReferralInput,
    createdByUserId: number,
    sourceHospitalId: number,
    requestingRole: TUserRole,
  ): Promise<IReferralDTO> {
    // System Admin cannot initiate patient referrals — Architecture Contract §3.1
    if (requestingRole === 'System Admin') {
      throw new ForbiddenError('System Admins cannot create patient referrals');
    }

    // Validate patient exists and belongs to this hospital
    const patient = await this.patientRepo.findByIdOrFail(input.patientId);
    if (patient.registered_at_hospital_id !== sourceHospitalId) {
      throw new ForbiddenError('Patient is not registered at your facility');
    }

    // Validate destination hospital exists and is Approved
    const destHospital = await this.hospitalRepo.findByIdOrFail(input.destinationHospitalId);
    if (destHospital.status !== 'Approved') {
      throw new InvalidStateError(
        `Destination hospital '${destHospital.name}' is not Approved (status: ${destHospital.status})`,
      );
    }

    // Cannot refer to own hospital
    if (input.destinationHospitalId === sourceHospitalId) {
      throw new InvalidStateError('Cannot create a self-referral (source and destination are the same)');
    }

    // Encrypt clinical summary — Module 9
    const clinicalSummaryEncrypted = encryptNullable(input.clinicalSummary ?? null);

    const createData: ICreateReferralData = {
      patientId: input.patientId,
      sourceHospitalId,
      destinationHospitalId: input.destinationHospitalId,
      createdByUserId,
      urgencyLevel: input.urgencyLevel,
      clinicalSummaryEncrypted,
      reasonForReferral: input.reasonForReferral,
    };

    const id  = await this.repo.create(createData);
    const row = await this.repo.findByIdOrFail(id);

    this.publishEvent('REFERRAL_CREATED', {
      referralId: id,
      patientId: input.patientId,
      sourceHospitalId,
      destinationHospitalId: input.destinationHospitalId,
      urgencyLevel: input.urgencyLevel,
    });
    this.logMutation('REFERRAL_CREATED', id, createdByUserId);

    return this.toDTO(row, requestingRole);
  }

  // ── Module 4: Read ────────────────────────────────────────────────────────

  async getReferralById(
    id: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IReferralDTO> {
    const row = await this.repo.findByIdOrFail(id);
    this.assertHospitalAccess(row, requestingRole, requestingHospitalId);
    return this.toDTO(row, requestingRole);
  }

  async getReferralByCode(
    code: string,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IReferralDTO> {
    const row = await this.repo.findByCode(code);
    if (!row) throw new NotFoundError('Referral');
    this.assertHospitalAccess(row, requestingRole, requestingHospitalId);
    return this.toDTO(row, requestingRole);
  }

  async listReferrals(
    pagination: IPaginationParams,
    filters: {
      status?: TReferralStatus;
      urgencyLevel?: string;
      patientId?: number;
      hospitalRole?: 'source' | 'destination' | 'any';
    },
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IListReferralsResult> {
    // Facility isolation — non-System Admins see only their hospital's referrals
    const effectiveFilters = requestingRole !== 'System Admin'
      ? { ...filters, hospitalId: requestingHospitalId ?? undefined }
      : filters;

    const [rows, total] = await Promise.all([
      this.repo.findAll(pagination, effectiveFilters),
      this.repo.countAll(effectiveFilters),
    ]);

    return {
      referrals:  rows.map((r) => this.toDTO(r, requestingRole)),
      pagination: buildPagination(pagination.page, pagination.limit, total),
    };
  }

  // ── Module 4: Update (Draft only) ─────────────────────────────────────────

  async updateReferral(
    id: number,
    input: IUpdateReferralInput,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): Promise<IReferralDTO> {
    const row = await this.repo.findByIdOrFail(id);

    // Only originating facility can update
    if (requestingRole !== 'System Admin' && row.source_hospital_id !== requestingHospitalId) {
      throw new ForbiddenError('Only the originating facility can update a referral');
    }

    if (row.current_status !== 'Draft') {
      throw new InvalidStateError(
        `Referral can only be updated while in 'Draft' status (current: '${row.current_status}')`,
      );
    }

    if (input.destinationHospitalId !== undefined) {
      if (input.destinationHospitalId === row.source_hospital_id) {
        throw new InvalidStateError('Cannot redirect referral to the originating hospital');
      }
      const destHospital = await this.hospitalRepo.findByIdOrFail(input.destinationHospitalId);
      if (destHospital.status !== 'Approved') {
        throw new InvalidStateError(`Destination hospital is not Approved`);
      }
    }

    const updateData: Parameters<typeof this.repo.update>[1] = {
      urgencyLevel:           input.urgencyLevel,
      reasonForReferral:      input.reasonForReferral,
      destinationHospitalId:  input.destinationHospitalId,
    };

    if (input.clinicalSummary !== undefined) {
      updateData.clinicalSummaryEncrypted = encryptNullable(input.clinicalSummary);
    }

    await this.repo.update(id, updateData);
    await this.cache.del(`referral:${id}`);
    this.logMutation('REFERRAL_UPDATED', id, requestingUserId);

    const updated = await this.repo.findByIdOrFail(id);
    return this.toDTO(updated, requestingRole);
  }

  // ── Module 4: Delete (Draft only) ─────────────────────────────────────────

  async deleteReferral(
    id: number,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): Promise<void> {
    const row = await this.repo.findByIdOrFail(id);

    if (requestingRole !== 'System Admin' && row.source_hospital_id !== requestingHospitalId) {
      throw new ForbiddenError('Only the originating facility can delete a referral');
    }

    if (row.current_status !== 'Draft') {
      throw new InvalidStateError(
        `Only Draft referrals can be deleted (current: '${row.current_status}')`,
      );
    }

    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Referral');

    await this.cache.del(`referral:${id}`);
    this.logMutation('REFERRAL_DELETED', id, requestingUserId);
    this.publishEvent('REFERRAL_DELETED', { referralId: id, deletedBy: requestingUserId });
  }

  // ── Module 5: Referral Status Workflow ────────────────────────────────────

  async transitionStatus(
    id: number,
    input: ITransitionInput,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): Promise<IReferralDTO> {
    const row = await this.repo.findByIdOrFail(id);

    // Terminal state guard
    if (isTerminalState(row.current_status)) {
      throw new InvalidStateError(
        `Referral '${row.referral_code}' is in terminal state '${row.current_status}' and cannot be transitioned`,
      );
    }

    // Validate transition via state machine (throws InvalidStateError on failure)
    validateTransition(row.current_status, input, requestingRole);

    // Facility access guard per transition direction
    this.assertTransitionAccess(row, input.newStatus, requestingRole, requestingHospitalId);

    // Delegate atomic transition to stored procedure
    const result = await this.repo.transitionStatus(
      id,
      input.newStatus,
      requestingUserId,
      input.notes ?? null,
      input.rejectionReason ?? null,
      input.ipAddress ?? null,
    );

    if (!result.success) {
      throw new InvalidStateError(
        result.errorMessage ?? `Transition to '${input.newStatus}' failed at database level`,
      );
    }

    await this.cache.del(`referral:${id}`);

    const updated     = await this.repo.findByIdOrFail(id);
    const description = describeTransition(row.current_status, input.newStatus);

    this.publishEvent('REFERRAL_STATUS_CHANGED', {
      referralId: id,
      referralCode: row.referral_code,
      previousStatus: row.current_status,
      newStatus: input.newStatus,
      actionByUserId: requestingUserId,
      description,
    });
    this.logMutation(`REFERRAL_${input.newStatus.toUpperCase()}`, id, requestingUserId);

    return this.toDTO(updated, requestingRole);
  }

  // ── Module 6: Referral Timeline ───────────────────────────────────────────

  async getReferralTimeline(
    referralId: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IReferralTimelineEntry[]> {
    // Verify referral exists and user has access
    const row = await this.repo.findByIdOrFail(referralId);
    this.assertHospitalAccess(row, requestingRole, requestingHospitalId);

    const logs = await this.repo.findLogsByReferralId(referralId);
    return logs.map((l) => this.toTimelineEntry(l));
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  async addAttachment(
    referralId: number,
    uploadedByUserId: number,
    requestingHospitalId: number | null,
    requestingRole: TUserRole,
    fileData: {
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      storagePath: string;
    },
  ): Promise<IAttachmentDTO> {
    const row = await this.repo.findByIdOrFail(referralId);
    this.assertHospitalAccess(row, requestingRole, requestingHospitalId);

    if (isTerminalState(row.current_status)) {
      throw new InvalidStateError('Cannot attach files to a completed referral');
    }

    const id = await this.repo.createAttachment(
      referralId,
      uploadedByUserId,
      fileData.fileName,
      fileData.fileSizeBytes,
      fileData.mimeType,
      fileData.storagePath,
    );

    this.logMutation('ATTACHMENT_ADDED', referralId, uploadedByUserId);

    const attachments = await this.repo.findAttachmentsByReferralId(referralId);
    const created     = attachments.find((a) => a.id === id)!;
    return this.toAttachmentDTO(created);
  }

  async getAttachments(
    referralId: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IAttachmentDTO[]> {
    const row = await this.repo.findByIdOrFail(referralId);
    this.assertHospitalAccess(row, requestingRole, requestingHospitalId);

    const attachments = await this.repo.findAttachmentsByReferralId(referralId);
    return attachments.map(this.toAttachmentDTO);
  }

  async removeAttachment(
    referralId: number,
    attachmentId: number,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): Promise<void> {
    const row = await this.repo.findByIdOrFail(referralId);

    if (requestingRole !== 'System Admin' && row.source_hospital_id !== requestingHospitalId) {
      throw new ForbiddenError('Only the originating facility can remove attachments');
    }

    const deleted = await this.repo.deleteAttachment(attachmentId, referralId);
    if (!deleted) throw new NotFoundError('Attachment');

    this.logMutation('ATTACHMENT_REMOVED', referralId, requestingUserId);
  }

  // ── Access guards ─────────────────────────────────────────────────────────

  private assertHospitalAccess(
    row: IReferralRow,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): void {
    if (requestingRole === 'System Admin') return;
    if (
      row.source_hospital_id      !== requestingHospitalId &&
      row.destination_hospital_id !== requestingHospitalId
    ) {
      throw new ForbiddenError('Access denied: referral does not involve your facility');
    }
  }

  private assertTransitionAccess(
    row: IReferralRow,
    newStatus: TReferralStatus,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): void {
    if (requestingRole === 'System Admin') return;

    // Source hospital actions: Dispatched, recall to Draft, Completed
    const sourceActions = new Set<TReferralStatus>(['Dispatched', 'Draft', 'Completed']);
    // Destination hospital actions: Received, Accepted, Rejected
    const destActions   = new Set<TReferralStatus>(['Received', 'Accepted', 'Rejected']);

    if (sourceActions.has(newStatus) && row.source_hospital_id !== requestingHospitalId) {
      throw new ForbiddenError(
        `Action '${newStatus}' can only be performed by the originating facility`,
      );
    }

    if (destActions.has(newStatus) && row.destination_hospital_id !== requestingHospitalId) {
      throw new ForbiddenError(
        `Action '${newStatus}' can only be performed by the receiving facility`,
      );
    }
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private toDTO(row: IReferralRow, requestingRole: TUserRole): IReferralDTO {
    return {
      id:                       row.id,
      referralCode:             row.referral_code,
      patientId:                row.patient_id,
      sourceHospitalId:         row.source_hospital_id,
      sourceHospitalName:       row.source_hospital_name,
      destinationHospitalId:    row.destination_hospital_id,
      destinationHospitalName:  row.destination_hospital_name,
      createdByUserId:          row.created_by_user_id,
      createdByUsername:        row.created_by_username,
      urgencyLevel:             row.urgency_level,
      clinicalSummary:          decryptNullable(row.clinical_summary_encrypted),
      reasonForReferral:        row.reason_for_referral,
      currentStatus:            row.current_status,
      rejectionReason:          row.rejection_reason,
      availableTransitions:     getAvailableTransitions(row.current_status, requestingRole),
      receivedByUserId:         row.received_by_user_id,
      acceptedRejectedByUserId: row.accepted_rejected_by_user_id,
      dispatchedAt:             row.dispatched_at,
      receivedAt:               row.received_at,
      acceptedAt:               row.accepted_at,
      rejectedAt:               row.rejected_at,
      completedAt:              row.completed_at,
      createdAt:                row.created_at,
      updatedAt:                row.updated_at,
    };
  }

  private toTimelineEntry(log: IReferralLogRow): IReferralTimelineEntry {
    return {
      id:               log.id,
      referralId:       log.referral_id,
      actionByUserId:   log.action_by_user_id,
      actionByUsername: log.action_by_username,
      previousStatus:   log.previous_status,
      newStatus:        log.new_status,
      description:      describeTransition(
        log.previous_status ?? log.new_status,
        log.new_status,
      ),
      notes:     log.notes,
      loggedAt:  log.logged_at,
    };
  }

  private toAttachmentDTO(row: IAttachmentRow): IAttachmentDTO {
    return {
      id:               row.id,
      referralId:       row.referral_id,
      uploadedByUserId: row.uploaded_by_user_id,
      uploadedByUsername: row.uploaded_by_username,
      fileName:         row.file_name,
      fileSizeBytes:    row.file_size_bytes,
      mimeType:         row.mime_type,
      isEncrypted:      row.is_encrypted === 1,
      createdAt:        row.created_at,
    };
  }
}
