/**
 * Users Module Tests
 * Covers Module 2 (User Management) and Module 10 (Role-Based Data Masking).
 */

import { UserService } from './users.service.js';
import {
  ConflictError,
  ForbiddenError,
  InvalidStateError,
} from '../../shared/errors/domain.errors.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../shared/services/crypto.service.js', () => ({
  encrypt: (v: string) => `ENC:${v}`,
  decryptNullable: (v: string | null) => (v ? v.replace('ENC:', '') : null),
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$hash'),
  compare: vi.fn().mockResolvedValue(true),
}));

const mockRepo = {
  findById: vi.fn(),
  findByIdOrFail: vi.fn(),
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  findAll: vi.fn(),
  countAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updatePassword: vi.fn(),
  updateStatus: vi.fn(),
  softDelete: vi.fn(),
};

const mockHospitalRepo = {
  findByIdOrFail: vi.fn().mockResolvedValue({ id: 1, status: 'Approved', name: 'KNH' }),
};

const mockCache = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
};

const baseUser = {
  id: 10,
  hospital_id: 1,
  username: 'drjohn',
  email: 'john@knh.or.ke',
  password_hash: '$2b$hash',
  role: 'Clinician' as const,
  full_name_encrypted: 'ENC:Dr John Kamau',
  phone_number: '+254722000001',
  two_factor_secret: null,
  is_two_factor_enabled: 0,
  status: 'Active' as const,
  last_login_at: null,
  password_changed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const makeService = () =>
  new UserService(mockRepo as never, mockHospitalRepo as never, mockCache as never);

describe('UserService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── createUser ─────────────────────────────────────────────────────────────

  describe('createUser', () => {
    const input = {
      hospitalId: 1,
      username: 'drjohn',
      email: 'john@knh.or.ke',
      password: 'Secure@123',
      role: 'Clinician' as const,
      fullName: 'Dr John Kamau',
    };

    it('creates a user when email and username are unique', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByUsername.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(10);
      mockRepo.findByIdOrFail.mockResolvedValue(baseUser);

      const service = makeService();
      const result  = await service.createUser(input, 'Hospital Admin', 1);

      expect(mockRepo.create).toHaveBeenCalledOnce();
      expect(result.username).toBe('drjohn');
      expect(result.fullName).toBe('Dr John Kamau');
    });

    it('throws ConflictError when email is taken', async () => {
      mockRepo.findByEmail.mockResolvedValue(baseUser);
      mockRepo.findByUsername.mockResolvedValue(null);

      const service = makeService();
      await expect(service.createUser(input, 'System Admin', null)).rejects.toThrow(ConflictError);
    });

    it('throws ForbiddenError when Hospital Admin tries to create for another hospital', async () => {
      const service = makeService();
      await expect(
        service.createUser({ ...input, hospitalId: 99 }, 'Hospital Admin', 1),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when Hospital Admin tries to create Hospital Admin role', async () => {
      const service = makeService();
      await expect(
        service.createUser({ ...input, role: 'Hospital Admin' }, 'Hospital Admin', 1),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ── Module 10: Role-Based Data Masking ────────────────────────────────────

  describe('Role-Based Data Masking', () => {
    beforeEach(() => {
      mockRepo.findByIdOrFail.mockResolvedValue(baseUser);
    });

    it('returns full name plaintext for Clinician', async () => {
      const service = makeService();
      const result  = await service.getUserById(10, 'Clinician', 1);
      expect(result.fullName).toBe('Dr John Kamau');
    });

    it('returns full name plaintext for Hospital Admin', async () => {
      const service = makeService();
      const result  = await service.getUserById(10, 'Hospital Admin', 1);
      expect(result.fullName).toBe('Dr John Kamau');
    });

    it('masks full name for Receptionist', async () => {
      const service = makeService();
      const result  = await service.getUserById(10, 'Receptionist', 1);
      expect(result.fullName).toBe('D. ****');
    });

    it('masks email for Receptionist', async () => {
      const service = makeService();
      const result  = await service.getUserById(10, 'Receptionist', 1);
      expect(result.email).toContain('****');
    });

    it('returns full name plaintext for System Admin', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseUser, hospital_id: null });
      const service = makeService();
      const result  = await service.getUserById(10, 'System Admin', null);
      expect(result.fullName).toBe('Dr John Kamau');
    });
  });

  // ── suspendUser ────────────────────────────────────────────────────────────

  describe('suspendUser', () => {
    it('suspends an Active user', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce(baseUser)
        .mockResolvedValueOnce({ ...baseUser, status: 'Suspended' });
      mockRepo.updateStatus.mockResolvedValue(true);

      const service = makeService();
      const result  = await service.suspendUser(10, 'Hospital Admin', 1);
      expect(result.status).toBe('Suspended');
    });

    it('throws InvalidStateError if already suspended', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseUser, status: 'Suspended' });

      const service = makeService();
      await expect(service.suspendUser(10, 'System Admin', null)).rejects.toThrow(InvalidStateError);
    });
  });
});
