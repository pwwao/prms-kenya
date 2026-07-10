/**
 * Hospitals Service
 *
 * Architecture Contract §4.2 — business logic lives here, not in controllers.
 * Facility Approval and Facility Suspension workflows are handled here.
 */

import { BaseService } from '../../shared/base.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  HospitalRepository,
  type IHospitalRow,
  type ICreateHospitalData,
  type IUpdateHospitalData,
  type IHospitalApprovalRow,
} from './hospitals.repository.js';
import {
  ConflictError,
  NotFoundError,
  InvalidStateError,
  ForbiddenError,
} from '../../shared/errors/domain.errors.js';
import { buildPagination, type IPaginationParams } from '../../shared/pagination.helper.js';
import type { IPagination } from '../../shared/response.helper.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IHospitalDTO {
  id: number;
  mohCode: string;
  name: string;
  facilityLevel: string;
  county: string;
  subCounty: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IListHospitalsResult {
  hospitals: IHospitalDTO[];
  pagination: IPagination;
}

export interface IApprovalHistoryResult {
  history: IHospitalApprovalRow[];
  pagination: IPagination;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class HospitalService extends BaseService {
  protected readonly moduleName = 'hospitals';

  constructor(
    private readonly repo: HospitalRepository,
    private readonly cache: CacheService,
  ) {
    super();
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createHospital(data: ICreateHospitalData): Promise<IHospitalDTO> {
    const existing = await this.repo.findByMohCode(data.mohCode);
    if (existing) {
      throw new ConflictError(`Hospital with MOH code '${data.mohCode}' already exists`);
    }

    const id = await this.repo.create(data);
    const hospital = await this.repo.findByIdOrFail(id);

    this.publishEvent('HOSPITAL_REGISTERED', { hospitalId: id, mohCode: data.mohCode });
    this.logMutation('HOSPITAL_REGISTERED', id);

    await this.cache.del(`hospital:${id}`);

    return this.toDTO(hospital);
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getHospitalById(id: number): Promise<IHospitalDTO> {
    const cacheKey = `hospital:${id}`;
    const cached = await this.cache.get<IHospitalDTO>(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey);
      return cached;
    }
    this.logCacheMiss(cacheKey);

    const hospital = await this.repo.findByIdOrFail(id);
    const dto = this.toDTO(hospital);

    await this.cache.set(cacheKey, dto, 300); // 5 min TTL
    return dto;
  }

  async listHospitals(
    pagination: IPaginationParams,
    filters: { status?: string; county?: string; facilityLevel?: string; q?: string },
    requestingRole: string,
  ): Promise<IListHospitalsResult> {
    // Non-System Admins only see Approved hospitals
    const effectiveFilters = requestingRole !== 'System Admin'
      ? { ...filters, status: 'Approved' }
      : filters;

    const [rows, total] = await Promise.all([
      this.repo.findAll(pagination, effectiveFilters),
      this.repo.countAll(effectiveFilters),
    ]);

    return {
      hospitals: rows.map(this.toDTO),
      pagination: buildPagination(pagination.page, pagination.limit, total),
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateHospital(
    id: number,
    data: IUpdateHospitalData,
    requestingRole: string,
    requestingHospitalId: number | null,
  ): Promise<IHospitalDTO> {
    const hospital = await this.repo.findByIdOrFail(id);

    if (requestingRole !== 'System Admin' && requestingHospitalId !== id) {
      throw new ForbiddenError('You can only update your own facility');
    }

    await this.repo.update(id, data);
    await this.cache.del(`hospital:${id}`);

    this.logMutation('HOSPITAL_UPDATED', id);
    const updated = await this.repo.findByIdOrFail(id);
    return this.toDTO(updated);
  }

  // ── Facility Approval (Module 7) ─────────────────────────────────────────

  async approveHospital(
    hospitalId: number,
    actionedByUserId: number,
    reason?: string,
  ): Promise<IHospitalDTO> {
    const hospital = await this.repo.findByIdOrFail(hospitalId);

    if (hospital.status === 'Approved') {
      throw new InvalidStateError(`Hospital is already Approved`);
    }

    await this.repo.transaction(async (conn) => {
      await this.repo.updateStatusInTransaction(conn, hospitalId, 'Approved');
      await this.repo.createApprovalRecord(
        conn, hospitalId, actionedByUserId,
        hospital.status, 'Approved', reason ?? null,
      );
    });

    await this.cache.del(`hospital:${hospitalId}`);
    this.publishEvent('HOSPITAL_APPROVED', { hospitalId, actionedByUserId });
    this.logMutation('HOSPITAL_APPROVED', hospitalId, actionedByUserId);

    return this.toDTO(await this.repo.findByIdOrFail(hospitalId));
  }

  // ── Facility Suspension (Module 8) ───────────────────────────────────────

  async suspendHospital(
    hospitalId: number,
    actionedByUserId: number,
    reason: string,
  ): Promise<IHospitalDTO> {
    const hospital = await this.repo.findByIdOrFail(hospitalId);

    if (hospital.status === 'Suspended') {
      throw new InvalidStateError(`Hospital is already Suspended`);
    }

    await this.repo.transaction(async (conn) => {
      await this.repo.updateStatusInTransaction(conn, hospitalId, 'Suspended');
      await this.repo.createApprovalRecord(
        conn, hospitalId, actionedByUserId,
        hospital.status, 'Suspended', reason,
      );
    });

    await this.cache.del(`hospital:${hospitalId}`);
    this.publishEvent('HOSPITAL_SUSPENDED', { hospitalId, actionedByUserId, reason });
    this.logMutation('HOSPITAL_SUSPENDED', hospitalId, actionedByUserId);

    return this.toDTO(await this.repo.findByIdOrFail(hospitalId));
  }

  async reactivateHospital(
    hospitalId: number,
    actionedByUserId: number,
    reason?: string,
  ): Promise<IHospitalDTO> {
    const hospital = await this.repo.findByIdOrFail(hospitalId);

    if (hospital.status !== 'Suspended') {
      throw new InvalidStateError(`Only Suspended hospitals can be reactivated`);
    }

    await this.repo.transaction(async (conn) => {
      await this.repo.updateStatusInTransaction(conn, hospitalId, 'Approved');
      await this.repo.createApprovalRecord(
        conn, hospitalId, actionedByUserId,
        'Suspended', 'Approved', reason ?? 'Reactivated by System Admin',
      );
    });

    await this.cache.del(`hospital:${hospitalId}`);
    this.publishEvent('HOSPITAL_REACTIVATED', { hospitalId, actionedByUserId });
    this.logMutation('HOSPITAL_REACTIVATED', hospitalId, actionedByUserId);

    return this.toDTO(await this.repo.findByIdOrFail(hospitalId));
  }

  // ── Approval history ─────────────────────────────────────────────────────

  async getApprovalHistory(
    hospitalId: number,
    pagination: IPaginationParams,
  ): Promise<IApprovalHistoryResult> {
    await this.repo.findByIdOrFail(hospitalId); // 404 guard

    const [history, total] = await Promise.all([
      this.repo.findApprovalHistory(hospitalId, pagination),
      this.repo.countApprovalHistory(hospitalId),
    ]);

    return {
      history,
      pagination: buildPagination(pagination.page, pagination.limit, total),
    };
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async deleteHospital(id: number, actionedByUserId: number): Promise<void> {
    await this.repo.findByIdOrFail(id);
    const deleted = await this.repo.softDelete('hospitals', id);
    if (!deleted) throw new NotFoundError('Hospital');

    await this.cache.del(`hospital:${id}`);
    this.logMutation('HOSPITAL_DELETED', id, actionedByUserId);
    this.publishEvent('HOSPITAL_DELETED', { hospitalId: id, actionedByUserId });
  }

  // ── Mapper ────────────────────────────────────────────────────────────────

  private toDTO(row: IHospitalRow): IHospitalDTO {
    return {
      id: row.id,
      mohCode: row.moh_code,
      name: row.name,
      facilityLevel: row.facility_level,
      county: row.county,
      subCounty: row.sub_county,
      address: row.address,
      phone: row.phone,
      email: row.email,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
