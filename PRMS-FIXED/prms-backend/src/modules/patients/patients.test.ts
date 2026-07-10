/**
 * Patients Module Tests
 * Covers Module 3, Module 9 (encryption), Module 10 (masking).
 */

import { PatientService } from './patients.service.js';
import { listPatientsQuerySchema, searchQuerySchema } from './patients.validator.js';
import { ConflictError, ForbiddenError } from '../../shared/errors/domain.errors.js';

vi.mock('../../shared/services/crypto.service.js', () => ({
  encrypt:         (v: string) => `ENC:${v}`,
  encryptNullable: (v: string | null) => (v ? `ENC:${v}` : null),
  decrypt:         (v: string) => v.replace('ENC:', ''),
  decryptNullable: (v: string | null) => (v ? v.replace('ENC:', '') : null),
}));

vi.mock('../../shared/services/hash.service.js', () => ({
  hashNationalId:      (v: string) => `HASH:${v}`,
  hashFullName:        (v: string) => `HASH:${v}`,
  hashPhone:           (v: string) => `HASH:${v}`,
  hashForIndexNullable:(v: string | null) => (v ? `HASH:${v}` : null),
  normaliseNationalId: (v: string) => v.toUpperCase(),
  normaliseFullName:   (v: string) => v.toLowerCase().trim(),
  normalisePhone:      (v: string) => v.replace(/\D/g, ''),
}));

const mockRepo = {
  findByIdOrFail: vi.fn(),
  findByNationalIdHash: vi.fn(),
  findByPhoneHash: vi.fn(),
  findAll: vi.fn(),
  countAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getReferralHistory: vi.fn(),
};

const mockCache = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
};

const basePatient = {
  id: 5,
  national_id_encrypted: 'ENC:12345678',
  national_id_hash: 'HASH:12345678',
  full_name_encrypted: 'ENC:Jane Wanjiku',
  full_name_hash: 'HASH:jane wanjiku',
  phone_encrypted: 'ENC:254722000002',
  phone_hash: 'HASH:254722000002',
  gender: 'Female' as const,
  date_of_birth: '1990-05-15',
  county: 'Nairobi',
  sub_county: 'Westlands',
  next_of_kin_name: 'James Wanjiku',
  next_of_kin_phone: '+254722000003',
  registered_by_user_id: 10,
  registered_by_username: 'drjohn',
  registered_at_hospital_id: 1,
  registered_at_hospital_name: 'KNH',
  created_at: new Date(),
  updated_at: new Date(),
};

const makeService = () =>
  new PatientService(mockRepo as never, mockCache as never);

describe('PatientService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('patient query validation', () => {
    it('allows searching by a free-form query without requiring national ID or phone', () => {
      const result = searchQuerySchema.safeParse({ q: 'Jane Wanjiku' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe('Jane Wanjiku');
      }
    });

    it('accepts q on the list endpoint', () => {
      const result = listPatientsQuerySchema.safeParse({ page: '1', limit: '20', q: 'Jane' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe('Jane');
      }
    });
  });

  // ── Module 9: Encryption ───────────────────────────────────────────────────

  describe('createPatient (Module 9: encryption)', () => {
    const input = {
      nationalId: '12345678',
      fullName: 'Jane Wanjiku',
      phone: '+254722000002',
      gender: 'Female' as const,
      dateOfBirth: '1990-05-15',
      county: 'Nairobi',
    };

    it('encrypts PII and stores blind indexes before insert', async () => {
      mockRepo.findByNationalIdHash.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(5);
      mockRepo.findByIdOrFail.mockResolvedValue(basePatient);

      const service = makeService();
      await service.createPatient(input, 10, 1);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nationalIdEncrypted: 'ENC:12345678',
          nationalIdHash: 'HASH:12345678',
          fullNameEncrypted: 'ENC:Jane Wanjiku',
          fullNameHash: expect.stringContaining('HASH:'),
          phoneEncrypted: 'ENC:254722000002',
          phoneHash: 'HASH:254722000002',
        }),
      );
    });

    it('throws ConflictError if national ID hash already exists', async () => {
      mockRepo.findByNationalIdHash.mockResolvedValue(basePatient);

      const service = makeService();
      await expect(service.createPatient(input, 10, 1)).rejects.toThrow(ConflictError);
    });

    it('decrypts PII in the returned DTO', async () => {
      mockRepo.findByNationalIdHash.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(5);
      mockRepo.findByIdOrFail.mockResolvedValue(basePatient);

      const service = makeService();
      const result  = await service.createPatient(input, 10, 1);

      expect(result.nationalId).toBe('12345678');
      expect(result.fullName).toBe('Jane Wanjiku');
      expect(result.phone).toBe('254722000002');
    });
  });

  // ── Module 10: Role-based masking ─────────────────────────────────────────

  describe('getPatientById (Module 10: masking)', () => {
    beforeEach(() => {
      mockRepo.findByIdOrFail.mockResolvedValue(basePatient);
    });

    it.each(['System Admin', 'Hospital Admin', 'Clinician'] as const)(
      'returns plaintext PII for %s',
      async (role) => {
        const service = makeService();
        const result  = await service.getPatientById(5, role, role === 'System Admin' ? null : 1);
        expect(result.fullName).toBe('Jane Wanjiku');
        expect(result.nationalId).toBe('12345678');
        expect(result.phone).toBe('254722000002');
      },
    );

    it('masks PII for Receptionist', async () => {
      const service = makeService();
      const result  = await service.getPatientById(5, 'Receptionist', 1);
      expect(result.fullName).toBe('J. ****');
      expect(result.nationalId).toContain('****');
      expect(result.phone).toContain('****');
    });

    it('throws ForbiddenError for cross-facility access', async () => {
      const service = makeService();
      await expect(service.getPatientById(5, 'Clinician', 99)).rejects.toThrow(ForbiddenError);
    });
  });

  // ── searchByNationalId ────────────────────────────────────────────────────

  describe('searchByNationalId', () => {
    it('uses blind index for lookup — never decrypts to search', async () => {
      mockRepo.findByNationalIdHash.mockResolvedValue(basePatient);

      const service = makeService();
      const result  = await service.searchByNationalId('12345678', 'Clinician', 1);

      expect(mockRepo.findByNationalIdHash).toHaveBeenCalledWith('HASH:12345678');
      expect(result?.fullName).toBe('Jane Wanjiku');
    });

    it('returns null when not found', async () => {
      mockRepo.findByNationalIdHash.mockResolvedValue(null);

      const service = makeService();
      const result  = await service.searchByNationalId('99999999', 'Clinician', 1);
      expect(result).toBeNull();
    });
  });
});
