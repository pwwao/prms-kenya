/**
 * Patients Service
 *
 * Implements:
 * - Module 3: Patient Management
 * - Module 9: Patient Encryption (AES-256-GCM for PII, HMAC blind index for search)
 * - Module 10: Role-Based Data Masking (Receptionist sees masked PII)
 *
 * Architecture Contract §9.5:
 *   "Encrypt before write, decrypt after read — in Service layer only."
 */

import { BaseService } from '../../shared/base.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  PatientRepository,
  type IPatientRow,
  type ICreatePatientData,
} from './patients.repository.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors/domain.errors.js';
import {
  encrypt,
  encryptNullable,
  decrypt,
  decryptNullable,
} from '../../shared/services/crypto.service.js';
import {
  hashNationalId,
  hashFullName,
  hashPhone,
  hashForIndexNullable,
  normaliseNationalId,
  normaliseFullName,
  normalisePhone,
} from '../../shared/services/hash.service.js';
import { buildPagination, type IPaginationParams } from '../../shared/pagination.helper.js';
import type { IPagination } from '../../shared/response.helper.js';
import type { TUserRole } from '../../config/jwt.config.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IPatientDTO {
  id: number;
  nationalId: string | null;     // decrypted or masked
  fullName: string;              // decrypted or masked
  phone: string | null;          // decrypted or masked
  gender: string;
  dateOfBirth: string;
  county: string;
  subCounty: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  registeredByUserId: number;
  registeredByUsername?: string;
  registeredAtHospitalId: number;
  registeredAtHospitalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IListPatientsResult {
  patients: IPatientDTO[];
  pagination: IPagination;
}

export interface ICreatePatientInput {
  nationalId?: string | null;
  fullName: string;
  phone?: string | null;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth: string;
  county: string;
  subCounty?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
}

export interface IUpdatePatientInput {
  fullName?: string;
  phone?: string | null;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth?: string;
  county?: string;
  subCounty?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
}

// ─── Module 10: Role-based masking helpers ────────────────────────────────────

const UNMASKED_ROLES: ReadonlySet<TUserRole> = new Set<TUserRole>([
  'System Admin',
  'Hospital Admin',
  'Clinician',
]);

function maskPatientDTO(dto: IPatientDTO): IPatientDTO {
  const nameParts = dto.fullName.trim().split(/\s+/);
  const maskedName = nameParts.length > 0
    ? `${nameParts[0]?.[0]?.toUpperCase() ?? '?'}. ****`
    : '****';

  return {
    ...dto,
    nationalId: dto.nationalId ? `****${dto.nationalId.slice(-3)}` : null,
    fullName: maskedName,
    phone: dto.phone ? `****${dto.phone.slice(-4)}` : null,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class PatientService extends BaseService {
  protected readonly moduleName = 'patients';

  constructor(
    private readonly repo: PatientRepository,
    private readonly cache: CacheService,
  ) {
    super();
  }

  // ── Create (Module 9: encrypt before write) ───────────────────────────────

  async createPatient(
    input: ICreatePatientInput,
    registeredByUserId: number,
    registeredAtHospitalId: number,
  ): Promise<IPatientDTO> {
    // Duplicate check via blind index (never decrypt to search)
    if (input.nationalId) {
      const normId   = normaliseNationalId(input.nationalId);
      const idHash   = hashNationalId(normId);
      const existing = await this.repo.findByNationalIdHash(idHash);
      if (existing) {
        throw new ConflictError(`A patient with this National ID is already registered`);
      }
    }

    // Encrypt PII — Architecture Contract §9.5
    const nationalIdEncrypted = input.nationalId
      ? encrypt(normaliseNationalId(input.nationalId))
      : null;
    const nationalIdHash = input.nationalId
      ? hashNationalId(normaliseNationalId(input.nationalId))
      : null;

    const normName         = normaliseFullName(input.fullName);
    const fullNameEncrypted = encrypt(input.fullName); // store original casing, normalise only for hash
    const fullNameHash      = hashFullName(normName);

    const normPhone         = input.phone ? normalisePhone(input.phone) : null;
    const phoneEncrypted    = encryptNullable(normPhone);
    const phoneHash         = hashForIndexNullable(normPhone);

    const createData: ICreatePatientData = {
      nationalIdEncrypted,
      nationalIdHash,
      fullNameEncrypted,
      fullNameHash,
      phoneEncrypted,
      phoneHash,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      county: input.county,
      subCounty: input.subCounty,
      nextOfKinName: input.nextOfKinName,
      nextOfKinPhone: input.nextOfKinPhone,
      registeredByUserId,
      registeredAtHospitalId,
    };

    const id  = await this.repo.create(createData);
    const row = await this.repo.findByIdOrFail(id);

    this.publishEvent('PATIENT_REGISTERED', {
      patientId: id,
      registeredByUserId,
      registeredAtHospitalId,
    });
    this.logMutation('PATIENT_REGISTERED', id, registeredByUserId);

    // Never cache raw patient rows — too sensitive; decrypt fresh each time
    return this.decryptRow(row);
  }

  // ── Read (Module 9: decrypt after read; Module 10: mask for Receptionist) ─

  async getPatientById(
    id: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IPatientDTO> {
    const row = await this.repo.findByIdOrFail(id);
    this.assertHospitalAccess(row.registered_at_hospital_id, requestingRole, requestingHospitalId);

    const dto = this.decryptRow(row);
    return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
  }

  async listPatients(
    pagination: IPaginationParams,
    filters: { county?: string; gender?: string; q?: string },
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IListPatientsResult> {
    // Facility isolation — non-System Admin users must have a hospitalId in their
    // JWT; if it is null the token was issued without one (data integrity issue).
    if (requestingRole !== 'System Admin' && requestingHospitalId === null) {
      throw new ForbiddenError(
        'Your account is not associated with a hospital. Contact your System Administrator.',
      );
    }
    const effectiveFilters = requestingRole !== 'System Admin'
      ? { ...filters, hospitalId: requestingHospitalId! }
      : filters;

    const [rows, total] = await Promise.all([
      this.repo.findAll(pagination, effectiveFilters),
      this.repo.countAll(effectiveFilters),
    ]);

    const dtos = rows.map((r) => {
      const dto = this.decryptRow(r);
      return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
    });

    return {
      patients: dtos,
      pagination: buildPagination(pagination.page, pagination.limit, total),
    };
  }

  // ── Search by PII — use blind index, never decrypt to search ─────────────

  async searchByNationalId(
    nationalId: string,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IPatientDTO | null> {
    const hash = hashNationalId(normaliseNationalId(nationalId));
    const row  = await this.repo.findByNationalIdHash(hash);
    if (!row) return null;

    this.assertHospitalAccess(row.registered_at_hospital_id, requestingRole, requestingHospitalId);
    const dto = this.decryptRow(row);
    return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
  }

  async searchByPhone(
    phone: string,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IPatientDTO[]> {
    const hash = hashPhone(normalisePhone(phone));
    const rows = await this.repo.findByPhoneHash(hash);

    return rows
      .filter((r) => requestingRole === 'System Admin' || r.registered_at_hospital_id === requestingHospitalId)
      .map((r) => {
        const dto = this.decryptRow(r);
        return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
      });
  }

  async searchByQuery(
    query: string,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IPatientDTO[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (/^\d{7,8}$/.test(trimmed)) {
      const patient = await this.searchByNationalId(trimmed, requestingRole, requestingHospitalId);
      return patient ? [patient] : [];
    }

    if (/^(?:\+254|0)[17]\d{8}$/.test(trimmed)) {
      return this.searchByPhone(trimmed, requestingRole, requestingHospitalId);
    }

    const hash = hashFullName(normaliseFullName(trimmed));
    const rows = await this.repo.findByFullNameHash(hash, {
      page: 1,
      limit: 20,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    return rows
      .filter((r) => requestingRole === 'System Admin' || r.registered_at_hospital_id === requestingHospitalId)
      .map((r) => {
        const dto = this.decryptRow(r);
        return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
      });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updatePatient(
    id: number,
    input: IUpdatePatientInput,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IPatientDTO> {
    const row = await this.repo.findByIdOrFail(id);
    this.assertHospitalAccess(row.registered_at_hospital_id, requestingRole, requestingHospitalId);

    const updateData: Parameters<typeof this.repo.update>[1] = {};

    if (input.fullName !== undefined) {
      updateData.fullNameEncrypted = encrypt(input.fullName);
      updateData.fullNameHash      = hashFullName(normaliseFullName(input.fullName));
    }
    if (input.phone !== undefined) {
      const normPhone = input.phone ? normalisePhone(input.phone) : null;
      updateData.phoneEncrypted = encryptNullable(normPhone);
      updateData.phoneHash      = hashForIndexNullable(normPhone);
    }
    if (input.gender      !== undefined) updateData.gender      = input.gender;
    if (input.dateOfBirth !== undefined) updateData.dateOfBirth = input.dateOfBirth;
    if (input.county      !== undefined) updateData.county      = input.county;
    if (input.subCounty   !== undefined) updateData.subCounty   = input.subCounty;
    if (input.nextOfKinName  !== undefined) updateData.nextOfKinName  = input.nextOfKinName;
    if (input.nextOfKinPhone !== undefined) updateData.nextOfKinPhone = input.nextOfKinPhone;

    await this.repo.update(id, updateData);
    this.logMutation('PATIENT_UPDATED', id);

    const updated = await this.repo.findByIdOrFail(id);
    const dto = this.decryptRow(updated);
    return UNMASKED_ROLES.has(requestingRole) ? dto : maskPatientDTO(dto);
  }

  // ── Referral history ──────────────────────────────────────────────────────

  async getPatientReferralHistory(
    patientId: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<unknown[]> {
    const row = await this.repo.findByIdOrFail(patientId);
    this.assertHospitalAccess(row.registered_at_hospital_id, requestingRole, requestingHospitalId);
    return this.repo.getReferralHistory(patientId);
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private assertHospitalAccess(
    resourceHospitalId: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): void {
    if (requestingRole === 'System Admin') return;
    if (requestingHospitalId === null) {
      throw new ForbiddenError(
        'Your account is not associated with a hospital. Contact your System Administrator.',
      );
    }
    if (requestingHospitalId !== resourceHospitalId) {
      throw new ForbiddenError('Access denied: patient belongs to another facility');
    }
  }

  // ── Module 9: Decrypt after read ─────────────────────────────────────────

  private decryptRow(row: IPatientRow): IPatientDTO {
    return {
      id: row.id,
      nationalId: decryptNullable(row.national_id_encrypted),
      fullName: decrypt(row.full_name_encrypted),
      phone: decryptNullable(row.phone_encrypted),
      gender: row.gender,
      dateOfBirth: row.date_of_birth,
      county: row.county,
      subCounty: row.sub_county,
      nextOfKinName: row.next_of_kin_name,
      nextOfKinPhone: row.next_of_kin_phone,
      registeredByUserId: row.registered_by_user_id,
      registeredByUsername: row.registered_by_username,
      registeredAtHospitalId: row.registered_at_hospital_id,
      registeredAtHospitalName: row.registered_at_hospital_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
