/**
 * Notifications Module — Unit Tests
 *
 * Tests NotificationsService channel decision engine and dispatch flows
 * with mocked repositories, queue, and crypto. No live DB/Redis required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_KEY = 'a'.repeat(64);
const TEST_SALT = 'b'.repeat(64);
process.env.DATABASE_ENCRYPTION_KEY = TEST_KEY;
process.env.HASH_SALT = TEST_SALT;

vi.mock('../../shared/queue/queue.js', () => ({
  enqueueFcm: vi.fn().mockResolvedValue(undefined),
  enqueueSms: vi.fn().mockResolvedValue(undefined),
  enqueueEmail: vi.fn().mockResolvedValue(undefined),
}));

import { NotificationsService } from './notifications.service.js';
import { NotificationsRepository } from './notifications.repository.js';
import { RecipientLookupRepository } from './recipient-lookup.repository.js';
import { enqueueFcm, enqueueSms, enqueueEmail } from '../../shared/queue/queue.js';
import { encrypt } from '../../shared/services/crypto.service.js';
import { NOTIFICATION_TYPES } from './notifications.events.js';

function mockNotificationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    user_id: 5,
    type: NOTIFICATION_TYPES.REFERRAL_DISPATCHED,
    title: 'New Referral Received',
    body: 'Referral REF-2026-001 dispatched',
    payload_json: JSON.stringify({ referralId: 10 }),
    channel: 'in_app',
    is_read: 0,
    created_at: new Date('2026-06-10T10:00:00.000Z'),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('dispatchReferralDispatched', () => {
    it('creates an in-app notification and enqueues push + email when contact info exists', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'create').mockResolvedValue(
        mockNotificationRow() as never,
      );
      vi.spyOn(RecipientLookupRepository.prototype, 'getFcmTokens').mockResolvedValue([
        { device_id: 'dev1', fcm_token: 'token-abc', platform: 'android' } as never,
      ]);
      vi.spyOn(RecipientLookupRepository.prototype, 'getRecipient').mockResolvedValue({
        id: 5,
        email: 'doc@hospital.ke',
        phone_number: '+254700000000',
        full_name_encrypted: encrypt('Dr Jane Doe'),
        status: 'Active',
      } as never);

      const results = await service.dispatchReferralDispatched({
        recipientUserIds: [5],
        referralCode: 'REF-2026-001',
        sourceHospitalName: 'Kenyatta Hospital',
        destinationHospitalName: 'Moi Teaching Hospital',
        urgencyLevel: 'Urgent',
        payload: { referralId: 10 },
      });

      expect(results).toHaveLength(1);
      expect(results[0].enqueued).toContain('push');
      expect(results[0].enqueued).toContain('email');
      expect(results[0].enqueued).not.toContain('sms'); // includeSms: false for dispatched

      expect(enqueueFcm).toHaveBeenCalledWith(
        expect.objectContaining({ fcmToken: 'token-abc', notificationId: 1 }),
      );
      expect(enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({ toAddress: 'doc@hospital.ke', toName: 'Dr Jane Doe' }),
      );
      expect(enqueueSms).not.toHaveBeenCalled();
    });

    it('does not enqueue push when user has no device tokens', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'create').mockResolvedValue(
        mockNotificationRow() as never,
      );
      vi.spyOn(RecipientLookupRepository.prototype, 'getFcmTokens').mockResolvedValue([]);
      vi.spyOn(RecipientLookupRepository.prototype, 'getRecipient').mockResolvedValue({
        id: 5,
        email: 'doc@hospital.ke',
        phone_number: null,
        full_name_encrypted: null,
        status: 'Active',
      } as never);

      const results = await service.dispatchReferralDispatched({
        recipientUserIds: [5],
        referralCode: 'REF-2026-001',
        sourceHospitalName: 'A',
        destinationHospitalName: 'B',
        urgencyLevel: 'Routine',
        payload: {},
      });

      expect(results[0].enqueued).not.toContain('push');
      expect(enqueueFcm).not.toHaveBeenCalled();
    });

    it('continues fan-out to other users when one recipient lookup fails', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'create')
        .mockRejectedValueOnce(new Error('db error'))
        .mockResolvedValueOnce(mockNotificationRow({ user_id: 6 }) as never);

      vi.spyOn(RecipientLookupRepository.prototype, 'getFcmTokens').mockResolvedValue([]);
      vi.spyOn(RecipientLookupRepository.prototype, 'getRecipient').mockResolvedValue({
        id: 6,
        email: 'doc2@hospital.ke',
        phone_number: null,
        full_name_encrypted: null,
        status: 'Active',
      } as never);

      const results = await service.dispatchReferralDispatched({
        recipientUserIds: [5, 6],
        referralCode: 'REF-2026-001',
        sourceHospitalName: 'A',
        destinationHospitalName: 'B',
        urgencyLevel: 'Routine',
        payload: {},
      });

      // Only the successful recipient produces a result
      expect(results).toHaveLength(1);
      expect(results[0].notification.user_id).toBe(6);
    });
  });

  describe('dispatchReferralCompleted', () => {
    it('does not enqueue SMS or email (includeSms/includeEmail false)', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'create').mockResolvedValue(
        mockNotificationRow({ type: NOTIFICATION_TYPES.REFERRAL_COMPLETED }) as never,
      );
      vi.spyOn(RecipientLookupRepository.prototype, 'getFcmTokens').mockResolvedValue([]);
      const getRecipientSpy = vi.spyOn(RecipientLookupRepository.prototype, 'getRecipient');

      await service.dispatchReferralCompleted({
        recipientUserIds: [5],
        referralCode: 'REF-2026-001',
        sourceHospitalName: 'A',
        destinationHospitalName: 'B',
        payload: {},
      });

      expect(getRecipientSpy).not.toHaveBeenCalled();
      expect(enqueueSms).not.toHaveBeenCalled();
      expect(enqueueEmail).not.toHaveBeenCalled();
    });
  });

  describe('dispatchMessageReceived', () => {
    it('decrypts sender name and never enqueues SMS/email', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'create').mockResolvedValue(
        mockNotificationRow({ type: NOTIFICATION_TYPES.MESSAGE_RECEIVED }) as never,
      );
      vi.spyOn(RecipientLookupRepository.prototype, 'getFcmTokens').mockResolvedValue([]);

      const results = await service.dispatchMessageReceived({
        recipientUserIds: [5],
        referralCode: 'REF-10',
        senderFullNameEncrypted: encrypt('Dr Jane Doe'),
        messagePreview: 'Patient is stable',
        payload: { referralId: 10, messageId: 1 },
      });

      expect(results).toHaveLength(1);
      expect(results[0].notification.body).toContain('Dr Jane Doe');
      expect(enqueueSms).not.toHaveBeenCalled();
      expect(enqueueEmail).not.toHaveBeenCalled();
    });
  });

  describe('listForUser / markAsRead', () => {
    it('returns mapped DTOs with parsed payload', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'findByUserId').mockResolvedValue([
        mockNotificationRow() as never,
      ]);
      vi.spyOn(NotificationsRepository.prototype, 'countByUserId').mockResolvedValue(1);

      const { notifications, total } = await service.listForUser(5, 20, 0);

      expect(total).toBe(1);
      expect(notifications[0]).toMatchObject({
        id: 1,
        isRead: false,
        payload: { referralId: 10 },
      });
    });

    it('markAsRead returns false when notification not owned by user', async () => {
      vi.spyOn(NotificationsRepository.prototype, 'markAsRead').mockResolvedValue(false);
      const result = await service.markAsRead(1, 999);
      expect(result).toBe(false);
    });
  });
});
