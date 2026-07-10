/**
 * Users Service
 *
 * Architecture Contract §4.2
 *
 * Implements:
 * - Module 2: User Management (CRUD, status transitions)
 * - Module 10: Role-Based Data Masking
 *   Clinician → full_name decrypted (patient:view_unmasked)
 *   Receptionist → full_name masked (patient:view_masked)
 *   Hospital Admin / System Admin → full_name decrypted
 */

import bcrypt from 'bcrypt';
import { BaseService } from '../../shared/base.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  UserRepository,
  type IUserRow,
  type ICreateUserData,
} from './users.repository.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
} from '../../shared/errors/domain.errors.js';
import { encrypt, decryptNullable } from '../../shared/services/crypto.service.js';
import { buildPagination, type IPaginationParams } from '../../shared/pagination.helper.js';
import type { IPagination } from '../../shared/response.helper.js';
import { env } from '../../config/env.config.js';
import type { TUserRole } from '../../config/jwt.config.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IUserPublicDTO {
  id: number;
  hospitalId: number | null;
  username: string;
  email: string | null;
  role: string;
  fullName: string | null;       // decrypted for authorised callers; masked/null otherwise
  phoneNumber: string | null;
  isTwoFactorEnabled: boolean;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IListUsersResult {
  users: IUserPublicDTO[];
  pagination: IPagination;
}

export interface ICreateUserInput {
  hospitalId: number | null;
  username: string;
  email?: string | null;
  password: string;
  role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
  fullName: string;
  phoneNumber?: string | null;
}

export interface IUpdateUserInput {
  email?: string | null;
  fullName?: string;
  phoneNumber?: string | null;
}

// ─── Role-Based Masking helper ────────────────────────────────────────────────
// Module 10 — determines whether the requesting role can see plaintext PII.

const UNMASKED_ROLES: ReadonlySet<TUserRole> = new Set([
  'System Admin',
  'Hospital Admin',
  'Clinician',
]);

function maskFullName(fullName: string | null): string | null {
  if (!fullName) return null;
  // Show first name initial + masked surname: "J. ****"
  const parts = fullName.trim().split(/\s+/);
  const initial = parts[0]?.[0]?.toUpperCase() ?? '?';
  return `${initial}. ****`;
}

function applyDataMask(
  dto: IUserPublicDTO,
  requestingRole: TUserRole,
): IUserPublicDTO {
  if (UNMASKED_ROLES.has(requestingRole)) return dto;
  return {
    ...dto,
    fullName: maskFullName(dto.fullName),
    email: dto.email ? dto.email.replace(/(.{2}).*(@.*)/, '$1****$2') : null, // partial email mask
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class UserService extends BaseService {
  protected readonly moduleName = 'users';

  constructor(
    private readonly repo: UserRepository,
    private readonly hospitalRepo: HospitalRepository,
    private readonly cache: CacheService,
  ) {
    super();
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createUser(
    input: ICreateUserInput,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IUserPublicDTO> {
    // Hospital Admin can only create users in their own hospital.
    // Guard: Hospital Admin must have a valid hospitalId in their JWT.
    if (requestingRole === 'Hospital Admin') {
      if (requestingHospitalId === null) {
        throw new ForbiddenError(
          'Your account is not associated with a hospital. Contact your System Administrator.',
        );
      }
      // Auto-assign the Hospital Admin’s own hospitalId if the frontend
      // sent null (e.g. stale session before the field was populated).
      if (input.hospitalId === null) {
        input = { ...input, hospitalId: requestingHospitalId };
      }
      if (input.hospitalId !== requestingHospitalId) {
        throw new ForbiddenError('Hospital Admin can only create users within their own facility');
      }
      // Hospital Admin cannot create System Admin or another Hospital Admin
      if (input.role === 'System Admin' || input.role === 'Hospital Admin') {
        throw new ForbiddenError('Hospital Admin cannot create this role');
      }
    }

    // Validate hospital exists and is Approved if specified
    if (input.hospitalId !== null) {
      const hospital = await this.hospitalRepo.findByIdOrFail(input.hospitalId);
      if (hospital.status === 'Suspended') {
        throw new ForbiddenError('Cannot create users for a suspended hospital');
      }
    }

    // Uniqueness checks
    const [byEmail, byUsername] = await Promise.all([
      input.email ? this.repo.findByEmail(input.email) : Promise.resolve(null),
      this.repo.findByUsername(input.username),
    ]);
    if (byEmail)    throw new ConflictError(`Email '${input.email}' is already registered`);
    if (byUsername) throw new ConflictError(`Username '${input.username}' is already taken`);

    const passwordHash      = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const fullNameEncrypted = encrypt(input.fullName);

    const id = await this.repo.create({
      hospitalId: input.hospitalId,
      username: input.username,
      email: input.email ?? null,
      passwordHash,
      role: input.role,
      fullNameEncrypted,
      phoneNumber: input.phoneNumber,
    });

    const row = await this.repo.findByIdOrFail(id);
    const loginUrl = `${env.API_BASE_URL.replace('/api/v1', '')}/login`;

    this.publishEvent('USER_CREATED', {
      userId: id,
      role: input.role,
      hospitalId: input.hospitalId,
      temporaryPassword: input.password,
      loginUrl,
    });
    this.logMutation('USER_CREATED', id);

    return this.toDTO(row);
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getUserById(
    id: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IUserPublicDTO> {
    const row = await this.repo.findByIdOrFail(id);
    this.assertReadAccess(row, requestingRole, requestingHospitalId);
    const dto = this.toDTO(row);
    return applyDataMask(dto, requestingRole);
  }

  async listUsers(
    pagination: IPaginationParams,
    filters: { hospitalId?: number; role?: string; status?: string },
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IListUsersResult> {
    // Facility isolation — non-System Admins scoped to their hospital.
    // Guard: if a non-System Admin somehow has a null hospitalId (data integrity
    // issue), return an empty list rather than leaking all users.
    if (requestingRole !== 'System Admin' && requestingHospitalId === null) {
      return { users: [], pagination: buildPagination(pagination.page, pagination.limit, 0) };
    }
    const effectiveFilters = requestingRole !== 'System Admin'
      ? { ...filters, hospitalId: requestingHospitalId! }
      : filters;

    const [rows, total] = await Promise.all([
      this.repo.findAll(pagination, effectiveFilters),
      this.repo.countAll(effectiveFilters),
    ]);

    return {
      users: rows.map((r) => applyDataMask(this.toDTO(r), requestingRole)),
      pagination: buildPagination(pagination.page, pagination.limit, total),
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateUser(
    id: number,
    input: IUpdateUserInput,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): Promise<IUserPublicDTO> {
    const row = await this.repo.findByIdOrFail(id);
    this.assertWriteAccess(row, requestingRole, requestingUserId, requestingHospitalId);

    if (input.email) {
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.id !== id) throw new ConflictError('Email is already in use');
    }

    await this.repo.update(id, {
      email: input.email,
      fullNameEncrypted: input.fullName ? encrypt(input.fullName) : undefined,
      phoneNumber: input.phoneNumber,
    });

    await this.cache.del(`user:${id}`);
    const updated = await this.repo.findByIdOrFail(id);
    return applyDataMask(this.toDTO(updated), requestingRole);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
    requestingUserId: number,
  ): Promise<void> {
    if (id !== requestingUserId) {
      throw new ForbiddenError('You can only change your own password');
    }
    const row = await this.repo.findByIdOrFail(id);
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) throw new ForbiddenError('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await this.repo.updatePassword(id, newHash);
    await this.cache.del(`user:${id}`);
    this.logMutation('PASSWORD_CHANGED', id, id);
  }

  // ── Status management ─────────────────────────────────────────────────────

  async suspendUser(
    id: number,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): Promise<IUserPublicDTO> {
    const row = await this.repo.findByIdOrFail(id);

    if (row.status === 'Suspended') throw new InvalidStateError('User is already suspended');

    // Hospital Admin can suspend within their hospital only; not other admins
    if (requestingRole === 'Hospital Admin') {
      if (row.hospital_id !== requestingHospitalId) {
        throw new ForbiddenError('You can only suspend users within your own facility');
      }
      if (row.role === 'System Admin' || row.role === 'Hospital Admin') {
        throw new ForbiddenError('Hospital Admin cannot suspend this role');
      }
    }

    await this.repo.updateStatus(id, 'Suspended');
    await this.cache.del(`user:${id}`);

    this.publishEvent('USER_SUSPENDED', { userId: id });
    this.logMutation('USER_SUSPENDED', id);

    const updated = await this.repo.findByIdOrFail(id);
    return this.toDTO(updated);
  }

  async reactivateUser(
    id: number,
    requestingRole: TUserRole,
  ): Promise<IUserPublicDTO> {
    if (requestingRole !== 'System Admin' && requestingRole !== 'Hospital Admin') {
      throw new ForbiddenError('Insufficient permissions to reactivate users');
    }

    const row = await this.repo.findByIdOrFail(id);
    if (row.status !== 'Suspended') throw new InvalidStateError('User is not suspended');

    await this.repo.updateStatus(id, 'Active');
    await this.cache.del(`user:${id}`);

    this.logMutation('USER_REACTIVATED', id);
    const updated = await this.repo.findByIdOrFail(id);
    return this.toDTO(updated);
  }

  async deleteUser(
    id: number,
    requestingRole: TUserRole,
    requestingUserId: number,
  ): Promise<void> {
    await this.repo.findByIdOrFail(id);

    if (id === requestingUserId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const deleted = await this.repo.softDelete('users', id);
    if (!deleted) throw new NotFoundError('User');

    await this.cache.del(`user:${id}`);
    this.logMutation('USER_DELETED', id, requestingUserId);
    this.publishEvent('USER_DELETED', { userId: id, deletedBy: requestingUserId });
  }

  // ── Access guards ─────────────────────────────────────────────────────────

  private assertReadAccess(
    row: IUserRow,
    requestingRole: TUserRole,
    requestingHospitalId: number | null,
  ): void {
    if (requestingRole === 'System Admin') return;
    if (row.hospital_id !== requestingHospitalId) {
      throw new ForbiddenError('Access denied: user belongs to another facility');
    }
  }

  private assertWriteAccess(
    row: IUserRow,
    requestingRole: TUserRole,
    requestingUserId: number,
    requestingHospitalId: number | null,
  ): void {
    // Own profile — always allowed
    if (row.id === requestingUserId) return;
    // System Admin — unrestricted
    if (requestingRole === 'System Admin') return;
    // Hospital Admin — same facility only
    if (requestingRole === 'Hospital Admin' && row.hospital_id === requestingHospitalId) return;
    throw new ForbiddenError('Access denied: insufficient permissions');
  }

  // ── Mapper (Module 10: decrypt PII) ──────────────────────────────────────

  private toDTO(row: IUserRow): IUserPublicDTO {
    return {
      id: row.id,
      hospitalId: row.hospital_id,
      username: row.username,
      email: row.email,
      role: row.role,
      fullName: decryptNullable(row.full_name_encrypted),
      phoneNumber: row.phone_number,
      isTwoFactorEnabled: row.is_two_factor_enabled === 1,
      status: row.status,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
