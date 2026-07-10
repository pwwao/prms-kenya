/**
 * Notifications Repository
 *
 * Architecture Contract §4.1 — Notification Service owns `notifications`,
 * `notification_logs`.
 * §9.2 — Queries live in Repository classes only.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export type TNotificationChannel = 'in_app' | 'push' | 'sms' | 'email';
export type TNotificationLogStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface INotificationRow extends mysql.RowDataPacket {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  payload_json: string | null;
  channel: TNotificationChannel;
  is_read: 0 | 1;
  created_at: Date;
}

export interface INotificationLogRow extends mysql.RowDataPacket {
  id: number;
  notification_id: number;
  channel: TNotificationChannel;
  status: TNotificationLogStatus;
  attempt_number: number;
  provider_ref: string | null;
  error_message: string | null;
  attempted_at: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class NotificationsRepository extends BaseRepository {
  protected readonly moduleName = 'notifications';

  /**
   * Creates an in-app notification record. Always created regardless of
   * channel — the in-app inbox is the system of record for all
   * notifications, per Architecture Contract §2.4 (INAPP branch always runs
   * alongside FCM/SMS/EMAIL).
   */
  async create(params: {
    userId: number;
    type: string;
    title: string;
    body: string;
    payloadJson?: Record<string, unknown> | null;
    channel: TNotificationChannel;
  }): Promise<INotificationRow> {
    const result = await this.mutate(
      `INSERT INTO notifications (user_id, type, title, body, payload_json, channel, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        params.userId,
        params.type,
        params.title,
        params.body,
        params.payloadJson ? JSON.stringify(params.payloadJson) : null,
        params.channel,
      ],
    );

    return this.queryOneOrFail<INotificationRow>(
      `SELECT id, user_id, type, title, body, payload_json, channel, is_read, created_at
         FROM notifications WHERE id = ?`,
      [result.insertId],
      'Notification',
    );
  }

  async findById(id: number): Promise<INotificationRow | null> {
    return this.queryOne<INotificationRow>(
      `SELECT id, user_id, type, title, body, payload_json, channel, is_read, created_at
         FROM notifications WHERE id = ?`,
      [id],
    );
  }

  /**
   * Returns paginated notifications for a user, most recent first.
   */
  async findByUserId(
    userId: number,
    limit: number,
    offset: number,
    unreadOnly = false,
  ): Promise<INotificationRow[]> {
    const filter = unreadOnly ? 'AND is_read = 0' : '';
    return this.query<INotificationRow>(
      `SELECT id, user_id, type, title, body, payload_json, channel, is_read, created_at
         FROM notifications
        WHERE user_id = ? ${filter}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
  }

  async countByUserId(userId: number, unreadOnly = false): Promise<number> {
    const filter = unreadOnly ? 'AND is_read = 0' : '';
    return this.count(
      `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? ${filter}`,
      [userId],
    );
  }

  /**
   * Returns all unread notifications for a user — used by the
   * `POST /api/v1/sync` offline sync endpoint (§13.3).
   */
  async findUnreadForSync(userId: number, since?: Date): Promise<INotificationRow[]> {
    if (since) {
      return this.query<INotificationRow>(
        `SELECT id, user_id, type, title, body, payload_json, channel, is_read, created_at
           FROM notifications
          WHERE user_id = ? AND is_read = 0 AND created_at >= ?
          ORDER BY created_at DESC`,
        [userId, since],
      );
    }
    return this.findByUserId(userId, 100, 0, true);
  }

  /**
   * Marks a single notification as read. Returns false if not found or not
   * owned by `userId` (caller should respond with 404/403 accordingly).
   */
  async markAsRead(id: number, userId: number): Promise<boolean> {
    const result = await this.mutate(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return result.affectedRows > 0;
  }

  /**
   * Marks all of a user's notifications as read.
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.mutate(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId],
    );
    return result.affectedRows;
  }

  // ─── Notification logs (delivery tracking) ──────────────────────────────────

  /**
   * Records a delivery attempt for a notification on a given channel.
   * Architecture Contract §2.4 — RETRY decision feeds into this log.
   */
  async logDeliveryAttempt(params: {
    notificationId: number;
    channel: TNotificationChannel;
    status: TNotificationLogStatus;
    attemptNumber: number;
    providerRef?: string | null;
    errorMessage?: string | null;
  }): Promise<INotificationLogRow> {
    const result = await this.mutate(
      `INSERT INTO notification_logs
         (notification_id, channel, status, attempt_number, provider_ref, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.notificationId,
        params.channel,
        params.status,
        params.attemptNumber,
        params.providerRef ?? null,
        params.errorMessage ?? null,
      ],
    );

    return this.queryOneOrFail<INotificationLogRow>(
      `SELECT id, notification_id, channel, status, attempt_number, provider_ref, error_message, attempted_at
         FROM notification_logs WHERE id = ?`,
      [result.insertId],
      'NotificationLog',
    );
  }

  /**
   * Returns the most recent log entry for a notification + channel —
   * used by the retry processor to determine the next attempt number.
   */
  async getLatestLog(
    notificationId: number,
    channel: TNotificationChannel,
  ): Promise<INotificationLogRow | null> {
    return this.queryOne<INotificationLogRow>(
      `SELECT id, notification_id, channel, status, attempt_number, provider_ref, error_message, attempted_at
         FROM notification_logs
        WHERE notification_id = ? AND channel = ?
        ORDER BY attempted_at DESC, id DESC
        LIMIT 1`,
      [notificationId, channel],
    );
  }

  /**
   * Returns all log entries with status='failed' that have reached the max
   * retry count — for the Dead Letter Queue / manual review view
   * (Architecture Contract §2.4).
   */
  async findDeadLetters(maxAttempts: number, limit: number, offset: number): Promise<INotificationLogRow[]> {
    return this.query<INotificationLogRow>(
      `SELECT id, notification_id, channel, status, attempt_number, provider_ref, error_message, attempted_at
         FROM notification_logs
        WHERE status = 'failed' AND attempt_number >= ?
        ORDER BY attempted_at DESC
        LIMIT ? OFFSET ?`,
      [maxAttempts, limit, offset],
    );
  }
}
