/**
 * Referrals Module Tests
 * Covers Module 4 (CRUD), Module 5 (State Workflow), Module 6 (Timeline).
 */

import {
  validateTransition,
  getAvailableTransitions,
  isTerminalState,
  describeTransition,
  type TReferralStatus,
} from './referrals.state-machine.js';
import { ReferralService } from './referrals.service.js';
import {
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
} from '../../shared/errors/domain.errors.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../shared/services/crypto.service.js', () => ({
  encryptNullable: (v: string | null) => (v ? `ENC:${v}` : null),
  decryptNullable: (v: string | null) => (v ? v.replace('ENC:', '') : null),
}));

const mockRepo = {
  findById: vi.fn(),
  findByIdOrFail: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  countAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transitionStatus: vi.fn(),
  findLogsByReferralId: vi.fn(),
  findAttachmentsByReferralId: vi.fn(),
  createAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getDashboardCounts: vi.fn(),
};

const mockPatientRepo = {
  findByIdOrFail: vi.fn().mockResolvedValue({
    id: 3,
    registered_at_hospital_id: 1,
  }),
};

const mockHospitalRepo = {
  findByIdOrFail: vi.fn().mockResolvedValue({
    id: 2,
    name: 'Nairobi Hospital',
    status: 'Approved',
  }),
};

const mockCache = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
};

const baseReferral = {
  id: 10,
  referral_code: 'REF-2024-00001',
  patient_id: 3,
  source_hospital_id: 1,
  destination_hospital_id: 2,
  created_by_user_id: 5,
  urgency_level: 'Routine' as const,
  clinical_summary_encrypted: 'ENC:Patient has hypertension',
  reason_for_referral: 'Specialist consultation required',
  current_status: 'Draft' as TReferralStatus,
  rejection_reason: null,
  received_by_user_id: null,
  accepted_rejected_by_user_id: null,
  dispatched_at: null,
  received_at: null,
  accepted_at: null,
  rejected_at: null,
  completed_at: null,
  source_hospital_name: 'KNH',
  destination_hospital_name: 'Nairobi Hospital',
  created_by_username: 'drjohn',
  created_at: new Date(),
  updated_at: new Date(),
};

const makeService = () =>
  new ReferralService(
    mockRepo as never,
    mockPatientRepo as never,
    mockHospitalRepo as never,
    mockCache as never,
  );

// ─── State Machine Unit Tests (Module 5) ──────────────────────────────────────

describe('Referrals State Machine', () => {
  describe('validateTransition', () => {
    it.each([
      ['Draft',      'Dispatched', 'Clinician'],
      ['Dispatched', 'Received',   'Receptionist'],
      ['Dispatched', 'Draft',      'Clinician'],
      ['Received',   'Accepted',   'Clinician'],
      ['Received',   'Rejected',   'Clinician'],
      ['Accepted',   'Completed',  'Clinician'],
      ['Rejected',   'Draft',      'Clinician'],
    ] as [TReferralStatus, TReferralStatus, string][])(
      'allows %s → %s for %s',
      (from, to, role) => {
        expect(() =>
          validateTransition(from, { newStatus: to, rejectionReason: to === 'Rejected' ? 'Reason provided' : undefined }, role),
        ).not.toThrow();
      },
    );

    it.each([
      ['Draft',     'Received'],
      ['Draft',     'Accepted'],
      ['Completed', 'Draft'],
      ['Completed', 'Accepted'],
    ] as [TReferralStatus, TReferralStatus][])(
      'rejects invalid transition %s → %s',
      (from, to) => {
        expect(() =>
          validateTransition(from, { newStatus: to }, 'Clinician'),
        ).toThrow(InvalidStateError);
      },
    );

    it('rejects Rejected transition without rejectionReason', () => {
      expect(() =>
        validateTransition('Received', { newStatus: 'Rejected', rejectionReason: '' }, 'Clinician'),
      ).toThrow(InvalidStateError);
    });

    it('rejects Receptionist trying to Accept a referral', () => {
      expect(() =>
        validateTransition('Received', { newStatus: 'Accepted' }, 'Receptionist'),
      ).toThrow(InvalidStateError);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns correct transitions for Clinician on Draft referral', () => {
      const transitions = getAvailableTransitions('Draft', 'Clinician');
      expect(transitions).toContain('Dispatched');
    });

    it('returns empty array for Completed (terminal state)', () => {
      const transitions = getAvailableTransitions('Completed', 'System Admin');
      expect(transitions).toHaveLength(0);
    });

    it('limits Receptionist to Dispatched and Received', () => {
      const fromDraft = getAvailableTransitions('Draft', 'Receptionist');
      expect(fromDraft).toContain('Dispatched');

      const fromDispatched = getAvailableTransitions('Dispatched', 'Receptionist');
      expect(fromDispatched).toContain('Received');

      const fromReceived = getAvailableTransitions('Received', 'Receptionist');
      expect(fromReceived).not.toContain('Accepted');
      expect(fromReceived).not.toContain('Rejected');
    });
  });

  describe('isTerminalState', () => {
    it('returns true for Completed', () => {
      expect(isTerminalState('Completed')).toBe(true);
    });

    it.each(['Draft', 'Dispatched', 'Received', 'Accepted', 'Rejected'] as TReferralStatus[])(
      'returns false for %s',
      (status) => {
        expect(isTerminalState(status)).toBe(false);
      },
    );
  });

  describe('describeTransition', () => {
    it('returns a human-readable description', () => {
      expect(describeTransition('Draft', 'Dispatched')).toContain('dispatched');
      expect(describeTransition('Received', 'Accepted')).toContain('accepted');
      expect(describeTransition('Accepted', 'Completed')).toContain('completed');
    });
  });
});

// ─── ReferralService Tests ────────────────────────────────────────────────────

describe('ReferralService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── createReferral ─────────────────────────────────────────────────────────

  describe('createReferral', () => {
    const input = {
      patientId: 3,
      destinationHospitalId: 2,
      urgencyLevel: 'Routine' as const,
      clinicalSummary: 'Patient has hypertension',
      reasonForReferral: 'Specialist consultation',
    };

    it('creates a Draft referral successfully', async () => {
      mockRepo.create.mockResolvedValue(10);
      mockRepo.findByIdOrFail.mockResolvedValue(baseReferral);

      const service  = makeService();
      const referral = await service.createReferral(input, 5, 1, 'Clinician');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 3,
          sourceHospitalId: 1,
          destinationHospitalId: 2,
          clinicalSummaryEncrypted: 'ENC:Patient has hypertension',
        }),
      );
      expect(referral.currentStatus).toBe('Draft');
      expect(referral.clinicalSummary).toBe('Patient has hypertension'); // decrypted
    });

    it('throws ForbiddenError for System Admin', async () => {
      const service = makeService();
      await expect(service.createReferral(input, 5, 1, 'System Admin')).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when patient is at a different hospital', async () => {
      mockPatientRepo.findByIdOrFail.mockResolvedValueOnce({
        id: 3,
        registered_at_hospital_id: 99, // different hospital
      });
      const service = makeService();
      await expect(service.createReferral(input, 5, 1, 'Clinician')).rejects.toThrow(ForbiddenError);
    });

    it('throws InvalidStateError for self-referral', async () => {
      const service = makeService();
      await expect(
        service.createReferral({ ...input, destinationHospitalId: 1 }, 5, 1, 'Clinician'),
      ).rejects.toThrow(InvalidStateError);
    });

    it('throws InvalidStateError when destination hospital is Suspended', async () => {
      mockHospitalRepo.findByIdOrFail.mockResolvedValueOnce({
        id: 2, name: 'Nairobi Hospital', status: 'Suspended',
      });
      const service = makeService();
      await expect(service.createReferral(input, 5, 1, 'Clinician')).rejects.toThrow(InvalidStateError);
    });
  });

  // ── transitionStatus (Module 5) ────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('dispatches a Draft referral successfully', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce({ ...baseReferral, current_status: 'Draft' })
        .mockResolvedValueOnce({ ...baseReferral, current_status: 'Dispatched', dispatched_at: new Date() });
      mockRepo.transitionStatus.mockResolvedValue({ success: true, errorMessage: null });

      const service  = makeService();
      const referral = await service.transitionStatus(
        10,
        { newStatus: 'Dispatched', notes: 'Patient en route' },
        'Clinician',
        5,
        1, // source hospital
      );

      expect(referral.currentStatus).toBe('Dispatched');
      expect(mockRepo.transitionStatus).toHaveBeenCalledWith(
        10, 'Dispatched', 5, 'Patient en route', null, null,
      );
      expect(mockCache.del).toHaveBeenCalledWith('referral:10');
    });

    it('throws InvalidStateError from stored procedure failure', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseReferral, current_status: 'Draft' });
      mockRepo.transitionStatus.mockResolvedValue({
        success: false,
        errorMessage: 'Concurrent update detected',
      });

      const service = makeService();
      await expect(
        service.transitionStatus(10, { newStatus: 'Dispatched' }, 'Clinician', 5, 1),
      ).rejects.toThrow(InvalidStateError);
    });

    it('throws ForbiddenError when destination hospital tries to Dispatch', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseReferral, current_status: 'Draft' });

      const service = makeService();
      await expect(
        service.transitionStatus(10, { newStatus: 'Dispatched' }, 'Clinician', 5, 2), // hospital 2 = destination
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws InvalidStateError on terminal Completed referral', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseReferral, current_status: 'Completed' });

      const service = makeService();
      await expect(
        service.transitionStatus(10, { newStatus: 'Draft' }, 'System Admin', 5, null),
      ).rejects.toThrow(InvalidStateError);
    });
  });

  // ── updateReferral — Draft only ────────────────────────────────────────────

  describe('updateReferral', () => {
    it('updates a Draft referral', async () => {
      mockRepo.findByIdOrFail
        .mockResolvedValueOnce({ ...baseReferral, current_status: 'Draft' })
        .mockResolvedValueOnce({ ...baseReferral, urgency_level: 'Urgent' });
      mockRepo.update.mockResolvedValue(true);

      const service = makeService();
      const result  = await service.updateReferral(
        10, { urgencyLevel: 'Urgent' }, 'Clinician', 5, 1,
      );
      expect(result.urgencyLevel).toBe('Urgent');
    });

    it('throws InvalidStateError when referral is not Draft', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue({ ...baseReferral, current_status: 'Dispatched' });

      const service = makeService();
      await expect(
        service.updateReferral(10, { urgencyLevel: 'Emergent' }, 'Clinician', 5, 1),
      ).rejects.toThrow(InvalidStateError);
    });
  });

  // ── Module 6: Timeline ────────────────────────────────────────────────────

  describe('getReferralTimeline', () => {
    it('returns timeline entries in chronological order', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue(baseReferral);
      mockRepo.findLogsByReferralId.mockResolvedValue([
        {
          id: 1, referral_id: 10, action_by_user_id: 5,
          previous_status: null, new_status: 'Draft',
          notes: 'Referral created', action_by_username: 'drjohn',
          logged_at: new Date('2024-01-01T09:00:00Z'),
        },
        {
          id: 2, referral_id: 10, action_by_user_id: 5,
          previous_status: 'Draft', new_status: 'Dispatched',
          notes: null, action_by_username: 'drjohn',
          logged_at: new Date('2024-01-01T10:00:00Z'),
        },
      ]);

      const service  = makeService();
      const timeline = await service.getReferralTimeline(10, 'Clinician', 1);

      expect(timeline).toHaveLength(2);
      expect(timeline[0]!.newStatus).toBe('Draft');
      expect(timeline[1]!.newStatus).toBe('Dispatched');
      expect(timeline[1]!.description).toContain('dispatched');
    });

    it('throws ForbiddenError for cross-facility access', async () => {
      mockRepo.findByIdOrFail.mockResolvedValue(baseReferral); // source: 1, dest: 2

      const service = makeService();
      await expect(
        service.getReferralTimeline(10, 'Clinician', 99), // hospital 99 is neither source nor dest
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
