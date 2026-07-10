/**
 * Chat Repository
 *
 * Architecture Contract §4.1 — Chat Service owns `messages`, `message_read_receipts`.
 * Architecture Contract §9.2 — Queries live in Repository classes only.
 * §9.5 — `message_text_encrypted` stores AES-256-GCM JSON; encryption/decryption
 * happens in the Service layer, never here.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IMessageRow extends mysql.RowDataPacket {
  id: number;
  referral_id: number;
  sender_id: number;
  message_text_encrypted: string;
  is_read: 0 | 1;
  created_at: Date;
}

export interface IMessageReadReceiptRow extends mysql.RowDataPacket {
  id: number;
  message_id: number;
  user_id: number;
  read_at: Date;
}

export interface IUnreadCountRow extends mysql.RowDataPacket {
  referral_id: number;
  unread_count: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class ChatRepository extends BaseRepository {
  protected readonly moduleName = 'chat';

  /**
   * Inserts a new chat message. The caller (ChatService) is responsible for
   * encrypting `messageTextEncrypted` before calling this method.
   */
  async createMessage(params: {
    referralId: number;
    senderId: number;
    messageTextEncrypted: string;
  }): Promise<IMessageRow> {
    const result = await this.mutate(
      `INSERT INTO messages (referral_id, sender_id, message_text_encrypted, is_read)
       VALUES (?, ?, ?, 0)`,
      [params.referralId, params.senderId, params.messageTextEncrypted],
    );

    return this.queryOneOrFail<IMessageRow>(
      `SELECT id, referral_id, sender_id, message_text_encrypted, is_read, created_at
         FROM messages WHERE id = ?`,
      [result.insertId],
      'Message',
    );
  }

  /**
   * Returns a single message by ID.
   */
  async findById(messageId: number): Promise<IMessageRow | null> {
    return this.queryOne<IMessageRow>(
      `SELECT id, referral_id, sender_id, message_text_encrypted, is_read, created_at
         FROM messages WHERE id = ?`,
      [messageId],
    );
  }

  /**
   * Returns paginated chat history for a referral, oldest-first by default
   * inversion handled by caller via sortOrder.
   */
  async findByReferralId(
    referralId: number,
    limit: number,
    offset: number,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<IMessageRow[]> {
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    return this.query<IMessageRow>(
      `SELECT id, referral_id, sender_id, message_text_encrypted, is_read, created_at
         FROM messages
        WHERE referral_id = ?
        ORDER BY created_at ${direction}, id ${direction}
        LIMIT ? OFFSET ?`,
      [referralId, limit, offset],
    );
  }

  /**
   * Counts total messages for a referral — used for pagination metadata.
   */
  async countByReferralId(referralId: number): Promise<number> {
    return this.count(
      `SELECT COUNT(*) AS total FROM messages WHERE referral_id = ?`,
      [referralId],
    );
  }

  /**
   * Marks a message as read at the aggregate level (`messages.is_read`).
   * Used as a quick "has anyone read this" flag; per-user tracking is in
   * `message_read_receipts`.
   */
  async markAsRead(messageId: number): Promise<void> {
    await this.mutate(`UPDATE messages SET is_read = 1 WHERE id = ?`, [messageId]);
  }

  /**
   * Records a per-user read receipt. Idempotent — relies on the
   * `uq_message_read_receipts (message_id, user_id)` unique key.
   */
  async upsertReadReceipt(messageId: number, userId: number): Promise<void> {
    await this.mutate(
      `INSERT INTO message_read_receipts (message_id, user_id, read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [messageId, userId],
    );
  }

  /**
   * Marks every unread message in a referral (sent by other users) as read
   * for the given user, and records receipts. Returns the IDs that were
   * newly marked, so the caller can emit `MESSAGE_DELIVERED` events.
   */
  async markAllAsReadForUser(referralId: number, userId: number): Promise<number[]> {
    const unread = await this.query<IMessageRow>(
      `SELECT id, referral_id, sender_id, message_text_encrypted, is_read, created_at
         FROM messages
        WHERE referral_id = ?
          AND sender_id != ?
          AND id NOT IN (
            SELECT message_id FROM message_read_receipts WHERE user_id = ?
          )`,
      [referralId, userId, userId],
    );

    if (unread.length === 0) return [];

    await this.transaction(async (conn) => {
      for (const msg of unread) {
        await this.mutateOnConnection(
          conn,
          `INSERT INTO message_read_receipts (message_id, user_id, read_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE read_at = NOW()`,
          [msg.id, userId],
        );
        await this.mutateOnConnection(conn, `UPDATE messages SET is_read = 1 WHERE id = ?`, [
          msg.id,
        ]);
      }
    });

    return unread.map((m) => m.id);
  }

  /**
   * Returns the count of unread messages per referral for a given user —
   * used to populate chat badges. `referralIds` should be the set of
   * referrals the user has access to (scoped by the Referral module).
   */
  async getUnreadCountsForUser(
    userId: number,
    referralIds: number[],
  ): Promise<IUnreadCountRow[]> {
    if (referralIds.length === 0) return [];

    const placeholders = referralIds.map(() => '?').join(', ');
    return this.query<IUnreadCountRow>(
      `SELECT m.referral_id AS referral_id, COUNT(*) AS unread_count
         FROM messages m
        WHERE m.referral_id IN (${placeholders})
          AND m.sender_id != ?
          AND m.id NOT IN (
            SELECT message_id FROM message_read_receipts WHERE user_id = ?
          )
        GROUP BY m.referral_id`,
      [...referralIds, userId, userId],
    );
  }
}
