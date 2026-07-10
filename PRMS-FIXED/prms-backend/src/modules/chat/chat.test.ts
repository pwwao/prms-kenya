/**
 * Chat Module — Unit Tests
 *
 * Tests ChatService business logic with mocked repository/access-guard
 * dependencies. No live DB or Redis required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_KEY = 'a'.repeat(64);
const TEST_SALT = 'b'.repeat(64);
process.env.DATABASE_ENCRYPTION_KEY = TEST_KEY;
process.env.HASH_SALT = TEST_SALT;

import { ChatService } from './chat.service.js';
import { ChatRepository } from './chat.repository.js';
import { ChatAccessGuard } from './chat-access.guard.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/domain.errors.js';
import { encrypt } from '../../shared/services/crypto.service.js';

vi.mock('../../config/redis.config.js', () => ({
  redisPublish: vi.fn().mockResolvedValue(undefined),
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
    vi.restoreAllMocks();
  });

  describe('assertAccess', () => {
    it('allows System Admin (hospitalId null) without a DB check', async () => {
      const spy = vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty');
      await service.assertAccess(10, null);
      expect(spy).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when hospital is not a party to the referral', async () => {
      vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty').mockRejectedValue(
        new NotFoundError('Referral'),
      );

      await expect(service.assertAccess(10, 99)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('passes for a hospital that is the source or destination', async () => {
      const spy = vi
        .spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty')
        .mockResolvedValue(undefined);

      await service.assertAccess(10, 7);
      expect(spy).toHaveBeenCalledWith(10, 7);
    });
  });

  describe('sendMessage', () => {
    it('encrypts content, persists, and returns decrypted DTO', async () => {
      vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty').mockResolvedValue(undefined);

      const created = {
        id: 101,
        referral_id: 10,
        sender_id: 5,
        message_text_encrypted: encrypt('Patient stable, en route'),
        is_read: 0 as const,
        created_at: new Date('2026-06-10T10:00:00.000Z'),
      };

      vi.spyOn(ChatRepository.prototype, 'createMessage').mockResolvedValue(created);

      const result = await service.sendMessage({
        referralId: 10,
        senderId: 5,
        senderRole: 'Clinician',
        senderHospitalId: 7,
        content: 'Patient stable, en route',
      });

      expect(result).toEqual({
        messageId: 101,
        referralId: 10,
        senderId: 5,
        content: 'Patient stable, en route',
        isRead: false,
        createdAt: '2026-06-10T10:00:00.000Z',
      });
    });

    it('rejects when sender hospital is not a party to the referral', async () => {
      vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty').mockRejectedValue(
        new NotFoundError('Referral'),
      );

      await expect(
        service.sendMessage({
          referralId: 10,
          senderId: 5,
          senderRole: 'Clinician',
          senderHospitalId: 99,
          content: 'hello',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getHistory', () => {
    it('returns decrypted messages and total count', async () => {
      vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty').mockResolvedValue(undefined);

      const row = {
        id: 1,
        referral_id: 10,
        sender_id: 5,
        message_text_encrypted: encrypt('hello there'),
        is_read: 1 as const,
        created_at: new Date('2026-06-10T09:00:00.000Z'),
      };

      vi.spyOn(ChatRepository.prototype, 'findByReferralId').mockResolvedValue([row]);
      vi.spyOn(ChatRepository.prototype, 'countByReferralId').mockResolvedValue(1);

      const result = await service.getHistory(10, 7, 20, 0);

      expect(result.total).toBe(1);
      expect(result.messages[0]).toMatchObject({
        messageId: 1,
        content: 'hello there',
        isRead: true,
      });
    });
  });

  describe('markAllAsRead', () => {
    it('returns IDs newly marked as read', async () => {
      vi.spyOn(ChatAccessGuard.prototype, 'assertHospitalIsParty').mockResolvedValue(undefined);
      vi.spyOn(ChatRepository.prototype, 'markAllAsReadForUser').mockResolvedValue([1, 2, 3]);

      const ids = await service.markAllAsRead(10, 5, 7);
      expect(ids).toEqual([1, 2, 3]);
    });
  });

  describe('assertSender', () => {
    it('throws ForbiddenError if message not found', async () => {
      vi.spyOn(ChatRepository.prototype, 'findById').mockResolvedValue(null);
      await expect(service.assertSender(1, 5)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('throws ForbiddenError if userId does not match sender', async () => {
      vi.spyOn(ChatRepository.prototype, 'findById').mockResolvedValue({
        id: 1,
        referral_id: 10,
        sender_id: 99,
        message_text_encrypted: encrypt('x'),
        is_read: 0,
        created_at: new Date(),
      } as never);

      await expect(service.assertSender(1, 5)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
