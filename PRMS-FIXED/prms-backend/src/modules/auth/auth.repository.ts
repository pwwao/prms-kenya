/**
 * Auth Repository
 * Architecture Contract §9.2 — all SQL here, no SQL in Services.
 *
 * Owns `refresh_tokens` and `device_sessions` (per Architecture Contract
 * §4.1 Service Ownership Matrix — "Auth Service: users, refresh_tokens,
 * device_sessions"). User account lookups themselves are delegated to
 * UserRepository (modules/users/users.repository.ts) rather than
 * duplicated here, since `users` is shared across modules and that
 * repository already implements findByEmail/findByUsername/etc.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface IRefreshTokenRow extends mysql.RowDataPacket {
  id: number;
  user_id: number;
  jti: string;
  expires_at: Date;
  revoked_at: Date | null;
  device_id: string | null;
  created_at: Date;
}

export interface IDeviceSessionRow extends mysql.RowDataPacket {
  id: number;
  user_id: number;
  device_id: string;
  fcm_token: string | null;
  platform: 'android' | 'ios' | 'web';
  last_seen_at: Date;
  created_at: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AuthRepository extends BaseRepository {
  protected readonly moduleName = 'auth';

  // ── refresh_tokens ───────────────────────────────────────────────────────

  /**
   * Records a newly-issued refresh token. Called on login and on every
   * token refresh (each refresh issues a fresh jti).
   */
  async createRefreshToken(
    userId: number,
    jti: string,
    expiresAt: Date,
    deviceId: string | null,
  ): Promise<void> {
    await this.mutate(
      `INSERT INTO refresh_tokens (user_id, jti, expires_at, device_id)
       VALUES (?, ?, ?, ?)`,
      [userId, jti, expiresAt, deviceId],
    );
  }

  /**
   * Returns the refresh_tokens row for a given jti, or null if not found.
   * Used to check whether a refresh token has already been revoked even
   * if its JWT signature/expiry still verify (defence in depth alongside
   * the stateless JWT check in token.service.ts).
   */
  async findRefreshTokenByJti(jti: string): Promise<IRefreshTokenRow | null> {
    return this.queryOne<IRefreshTokenRow>(
      `SELECT * FROM refresh_tokens WHERE jti = ?`,
      [jti],
    );
  }

  /** Marks a single refresh token as revoked (used on logout / rotation). */
  async revokeRefreshToken(jti: string): Promise<void> {
    await this.mutate(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = ? AND revoked_at IS NULL`,
      [jti],
    );
  }

  /** Revokes every active refresh token for a user (used on password change / force logout-all). */
  async revokeAllRefreshTokensForUser(userId: number): Promise<void> {
    await this.mutate(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  }

  // ── device_sessions ──────────────────────────────────────────────────────

  /**
   * Upserts a device session — one row per (user, device) pair, per the
   * table's unique key. Called from POST /auth/register-device.
   */
  async upsertDeviceSession(
    userId: number,
    deviceId: string,
    fcmToken: string | null,
    platform: 'android' | 'ios' | 'web',
  ): Promise<void> {
    await this.mutate(
      `INSERT INTO device_sessions (user_id, device_id, fcm_token, platform)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         fcm_token = VALUES(fcm_token),
         platform  = VALUES(platform),
         last_seen_at = NOW()`,
      [userId, deviceId, fcmToken, platform],
    );
  }

  /** Returns all device sessions for a user (used to fan out push notifications). */
  async findDeviceSessionsByUserId(userId: number): Promise<IDeviceSessionRow[]> {
    return this.query<IDeviceSessionRow>(
      `SELECT * FROM device_sessions WHERE user_id = ?`,
      [userId],
    );
  }

  /** Removes a single device session (used on logout from that device, optional cleanup). */
  async deleteDeviceSession(userId: number, deviceId: string): Promise<void> {
    await this.mutate(
      `DELETE FROM device_sessions WHERE user_id = ? AND device_id = ?`,
      [userId, deviceId],
    );
  }
}
