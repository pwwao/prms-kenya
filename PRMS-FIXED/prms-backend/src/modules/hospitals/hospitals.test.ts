/**
 * Hospitals Module Tests
 *
 * Unit tests for HospitalService business logic.
 * Integration-style tests for repository queries (mocked DB).
 */

import { HospitalService } from './hospitals.service.js';
import { ConflictError, InvalidStateError, NotFoundError } from '../../shared/errors/domain.errors.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRepo = {
  findById: vi.fn(),
  findByIdOrFail: vi.fn(),
  findByMohCode: vi.fn(),
  findAll: vi.fn(),
  countAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  softDelete: vi.fn(),
  createApprovalRecord: vi.fn(),
  updateStatusInTransaction: vi.fn(),
  findApprovalHistory: vi.fn(),
  countApprovalHistory: vi.fn(),
  transaction: vi.fn(),
};

const mockCache = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
};

const baseHospital = {
  id: 1,
  moh_code: 'KNH-001',
  name: 'Kenyatta National Hospital',
  facility_level: 'Level 6' as const,
  county: 'Nairobi',
  sub_county: 'Nairobi Central',
  address: 'Hospital Road, Nairobi',
  phone: '+254722000001',
  email: 'info@knh.or.ke',
  status: 'Pending' as const,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const makeService = () =>
  new HospitalService(mockRepo as never, mockCache as never);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HospitalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createHospital ─────────────────────────────────────────────────────────

  describe('createHospital', () => {
    const input = {
      mohCode: 'KNH-001',
      name: 'Kenyatta National Hospital',
      facilityLevel: 'Level 6' as const,
      county: 'Nairobi',
      subCounty: 'Nairobi Central',
    };

    it('creates a hospital when MOH code is unique', async () => {
      mockRepo.findByMohCode.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(1);
      mockRepo.findByIdOrFail.mockResolvedValue(baseHospital);

      const service = makeService();
      const result = await service.createHospital(input);

      expect(mockRepo.findByMohCode).toHaveBeenCalledWith('KNH-001');
      expect(mockRepo.create).toHaveBeenCalledOnce();
      expect(result.mohCode).toBe('KNH-001');
      expect(result.status).toBe('Pending');
    });

    it('throws ConflictError when MOH code is already registered', async () => {
      mockRepo.findByMohCode.mockResolvedValue(baseHospital);

      const service = makeService();
      await expect(service.createHospital(input)).rejects.toThrow(ConflictError);
    });
  });

  // ── approveHospital ────────────────────────────────────────────────────────

  describe('approveHospital', () => {
    it('transitions Pending → Approved', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce({ ...baseHospital, status: 'Pending' })
        .mockResolvedValueOnce({ ...baseHospital, status: 'Approved' });
      mockRepo.transaction.mockImplementation(async (fn: (c: unknown) => Promise<void>) => fn({}));
      mockRepo.updateStatusInTransaction.mockResolvedValue(true);
      mockRepo.createApprovalRecord.mockResolvedValue(1);

      const service = makeService();
      const result = await service.approveHospital(1, 99, 'All docs verified');

      expect(result.status).toBe('Approved');
      expect(mockCache.del).toHaveBeenCalledWith('hospital:1');
    });

    it('throws InvalidStateError if already Approved', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseHospital, status: 'Approved' });

      const service = makeService();
      await expect(service.approveHospital(1, 99)).rejects.toThrow(InvalidStateError);
    });
  });

  // ── suspendHospital ────────────────────────────────────────────────────────

  describe('suspendHospital', () => {
    it('transitions Approved → Suspended', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce({ ...baseHospital, status: 'Approved' })
        .mockResolvedValueOnce({ ...baseHospital, status: 'Suspended' });
      mockRepo.transaction.mockImplementation(async (fn: (c: unknown) => Promise<void>) => fn({}));
      mockRepo.updateStatusInTransaction.mockResolvedValue(true);
      mockRepo.createApprovalRecord.mockResolvedValue(1);

      const service = makeService();
      const result = await service.suspendHospital(1, 99, 'Non-compliance with safety standards');

      expect(result.status).toBe('Suspended');
    });

    it('throws InvalidStateError if already Suspended', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseHospital, status: 'Suspended' });

      const service = makeService();
      await expect(service.suspendHospital(1, 99, 'reason')).rejects.toThrow(InvalidStateError);
    });
  });

  // ── reactivateHospital ─────────────────────────────────────────────────────

  describe('reactivateHospital', () => {
    it('transitions Suspended → Approved', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce({ ...baseHospital, status: 'Suspended' })
        .mockResolvedValueOnce({ ...baseHospital, status: 'Approved' });
      mockRepo.transaction.mockImplementation(async (fn: (c: unknown) => Promise<void>) => fn({}));
      mockRepo.updateStatusInTransaction.mockResolvedValue(true);
      mockRepo.createApprovalRecord.mockResolvedValue(1);

      const service = makeService();
      const result = await service.reactivateHospital(1, 99);
      expect(result.status).toBe('Approved');
    });

    it('throws InvalidStateError if not Suspended', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseHospital, status: 'Pending' });

      const service = makeService();
      await expect(service.reactivateHospital(1, 99)).rejects.toThrow(InvalidStateError);
    });
  });

  // ── getHospitalById ────────────────────────────────────────────────────────

  describe('getHospitalById', () => {
    it('returns cached value when present', async () => {
      const cached = { id: 1, mohCode: 'KNH-001' };
      mockCache.get.mockResolvedValue(cached);

      const service = makeService();
      const result = await service.getHospitalById(1);

      expect(result).toEqual(cached);
      expect(mockRepo.findByIdOrFail).not.toHaveBeenCalled();
    });

    it('fetches from DB and caches on cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.findByIdOrFail.mockResolvedValue(baseHospital);

      const service = makeService();
      const result = await service.getHospitalById(1);

      expect(mockRepo.findByIdOrFail).toHaveBeenCalledWith(1);
      expect(mockCache.set).toHaveBeenCalledWith('hospital:1', expect.any(Object), 300);
      expect(result.id).toBe(1);
    });
  });

  // ── listHospitals ──────────────────────────────────────────────────────────

  describe('listHospitals', () => {
    const pagination = { page: 1, limit: 20, offset: 0, sortOrder: 'desc' as const };

    it('enforces Approved filter for non-System Admin', async () => {
      mockRepo.findAll.mockResolvedValue([baseHospital]);
      mockRepo.countAll.mockResolvedValue(1);

      const service = makeService();
      await service.listHospitals(pagination, {}, 'Clinician');

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        pagination,
        expect.objectContaining({ status: 'Approved' }),
      );
    });

    it('passes filter as-is for System Admin', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.countAll.mockResolvedValue(0);

      const service = makeService();
      await service.listHospitals(pagination, { status: 'Pending' }, 'System Admin');

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        pagination,
        { status: 'Pending' },
      );
    });

    it('passes the search text through to the repository', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.countAll.mockResolvedValue(0);

      const service = makeService();
      await service.listHospitals(pagination, { q: 'Nakuru' }, 'Clinician');

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        pagination,
        expect.objectContaining({ q: 'Nakuru', status: 'Approved' }),
      );
    });
  });
});
