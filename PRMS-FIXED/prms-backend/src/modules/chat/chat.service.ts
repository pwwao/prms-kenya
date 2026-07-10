/**
 * Chat Service
 *
 * Architecture Contract §4.1 — Chat Service owns `messages`, `message_read_receipts`.
 * §9.5 / §10.4 — Message content is encrypted at rest with AES-256-GCM.
 * §13.1 — Publishes `MESSAGE_SENT` domain events for the Notification Service.
 * §13.4 — Backs the `/chat` Socket.IO namespace event contracts.
 */

import { BaseService } from '../../shared/base.service.js';
import { ChatRepository, type IMessageRow, type IUnreadCountRow } from './chat.repository.js';
import { ChatAccessGuard } from './chat-access.guard.js';
import { encrypt, decrypt } from '../../shared/services/crypto.service.js';
import { ForbiddenError } from '../../shared/errors/domain.errors.js';
import type { TUserRole } from '../../config/jwt.config.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ISendMessageParams {
  referralId: number;
  senderId: number;
  senderRole: TUserRole;
  senderHospitalId: number | null;
  content: string;
}

export interface IMessageDto {
  messageId: number;
  referralId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface IChatHistoryDto {
  messages: IMessageDto[];
  total: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ChatService extends BaseService {
  protected readonly moduleName = 'chat';

  private readonly repository = new ChatRepository();
  private readonly accessGuard = new ChatAccessGuard();

  /**
   * Verifies the user's hospital is a party to the referral.
   * System Admin (hospitalId === null) bypasses the facility check.
   * Architecture Contract §10.3 — Facility Isolation Rule.
   */
  async assertAccess(referralId: number, hospitalId: number | null): Promise<void> {
    if (hospitalId === null) return; // System Admin
    await this.accessGuard.assertHospitalIsParty(referralId, hospitalId);
  }

  /**
   * Encrypts and persists a new chat message, then publishes `MESSAGE_SENT`.
   * The Socket.IO gateway calls this and broadcasts the returned DTO to the
   * `referral:{id}` room.
   */
  async sendMessage(params: ISendMessageParams): Promise<IMessageDto> {
    await this.assertAccess(params.referralId, params.senderHospitalId);

    const encryptedContent = encrypt(params.content);

    const row = await this.repository.createMessage({
      referralId: params.referralId,
      senderId: params.senderId,
      messageTextEncrypted: encryptedContent,
    });

    this.logMutation('SEND_MESSAGE', row.id, params.senderId, {
      referralId: params.referralId,
    });

    // Architecture Contract §13.1 — domain event for Notification Service.
    // Payload carries plaintext content for push/SMS previews per
    // Architecture Contract §2.4; Notification Service truncates as needed.
    this.publishEvent('MESSAGE_SENT', {
      messageId: row.id,
      referralId: params.referralId,
      senderId: params.senderId,
      senderRole: params.senderRole,
      content: params.content,
      createdAt: row.created_at.toISOString(),
    });

    return this.toDto(row, params.content);
  }

  /**
   * Returns paginated chat history for a referral, decrypting message content.
   */
  async getHistory(
    referralId: number,
    hospitalId: number | null,
    limit: number,
    offset: number,
  ): Promise<IChatHistoryDto> {
    await this.assertAccess(referralId, hospitalId);

    const [rows, total] = await Promise.all([
      this.repository.findByReferralId(referralId, limit, offset, 'asc'),
      this.repository.countByReferralId(referralId),
    ]);

    return {
      messages: rows.map((row) => this.toDto(row)),
      total,
    };
  }

  /**
   * Marks all unread messages in a referral as read for the given user.
   * Returns the message IDs that were newly marked — the gateway uses these
   * to emit `MESSAGE_DELIVERED` to the sender(s).
   */
  async markAllAsRead(
    referralId: number,
    userId: number,
    hospitalId: number | null,
  ): Promise<number[]> {
    await this.assertAccess(referralId, hospitalId);
    const markedIds = await this.repository.markAllAsReadForUser(referralId, userId);

    if (markedIds.length > 0) {
      this.logMutation('MARK_MESSAGES_READ', referralId, userId, {
        count: markedIds.length,
      });
    }

    return markedIds;
  }

  /**
   * Returns unread message counts per referral for a user — used for
   * inbox/chat badges. `referralIds` must already be scoped to the user's
   * accessible referrals by the caller (Referral module).
   */
  async getUnreadCounts(userId: number, referralIds: number[]): Promise<IUnreadCountRow[]> {
    return this.repository.getUnreadCountsForUser(userId, referralIds);
  }

  /**
   * Verifies that `userId` is the sender of `messageId` — used by the
   * gateway to prevent spoofed `MESSAGE_DELIVERED` triggers if needed.
   */
  async assertSender(messageId: number, userId: number): Promise<IMessageRow> {
    const message = await this.repository.findById(messageId);
    if (!message) {
      throw new ForbiddenError('Message not found or access denied');
    }
    if (message.sender_id !== userId) {
      throw new ForbiddenError('You are not the sender of this message');
    }
    return message;
  }

  // ─── Mapping ────────────────────────────────────────────────────────────────

  private toDto(row: IMessageRow, plaintextOverride?: string): IMessageDto {
    return {
      messageId: row.id,
      referralId: row.referral_id,
      senderId: row.sender_id,
      content: plaintextOverride ?? decrypt(row.message_text_encrypted),
      isRead: row.is_read === 1,
      createdAt: row.created_at.toISOString(),
    };
  }
}
