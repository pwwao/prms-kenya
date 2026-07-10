/**
 * Recipient Lookup Repository
 *
 * Architecture Contract §4.1 — `users` and `device_sessions` are owned by
 * the Auth Service. This repository performs **read-only** lookups of the
 * minimal contact fields (email, phone, FCM tokens, encrypted name) needed
 * to dispatch notifications. No writes occur here.
 *
 * §9.5 — `full_name_encrypted` is decrypted only inside the Notification
 * Service layer (never in repositories/controllers), and only for use in
 * template rendering — never logged.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import { NotFoundError } from '../../shared/errors/domain.errors.js';

export interface IRecipientRow extends mysql.RowDataPacket {
  id: number;
  email: string;
  phone_number: string | null;
  full_name_encrypted: string | null;
  status: 'Active' | 'Inactive' | 'Suspended';
}

export interface IDeviceTokenRow extends mysql.RowDataPacket {
  device_id: string;
  fcm_token: string | null;
  platform: 'android' | 'ios' | 'web';
}

export class RecipientLookupRepository extends BaseRepository {
  protected readonly moduleName = 'notifications';

  /**
   * Returns the minimal contact fields for a user. Throws NotFoundError if
   * the user does not exist or has been soft-deleted.
   */
  async getRecipient(userId: number): Promise<IRecipientRow> {
    return this.queryOneOrFail<IRecipientRow>(
      `SELECT id, email, phone_number, full_name_encrypted, status
         FROM users
        WHERE id = ? AND deleted_at IS NULL`,
      [userId],
      'User',
    );
  }

  /**
   * Returns all registered FCM tokens for a user's active devices.
   * A user may have multiple devices (Architecture Contract §12.3).
   */
  async getFcmTokens(userId: number): Promise<IDeviceTokenRow[]> {
    return this.query<IDeviceTokenRow>(
      `SELECT device_id, fcm_token, platform
         FROM device_sessions
        WHERE user_id = ? AND fcm_token IS NOT NULL`,
      [userId],
    );
  }
}
