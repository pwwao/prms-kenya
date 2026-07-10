/**
 * Base Repository
 *
 * Architecture Contract §9.2 — Queries live in Repository classes only.
 * No SQL in Controllers or Services.
 * All queries use mysql2 `execute()` for prepared statements.
 *
 * Business modules extend this class and add their own typed queries.
 */

import type mysql from 'mysql2/promise';
import { getPrimaryPool, withTransaction } from '../config/database.config.js';
import { NotFoundError } from './errors/domain.errors.js';
import { logger } from '../config/logger.config.js';

export abstract class BaseRepository {
  /** The module name — used in log messages. */
  protected abstract readonly moduleName: string;

  /** Returns the primary pool. Subclasses may override for replica routing. */
  protected getPool(): mysql.Pool {
    return getPrimaryPool();
  }

  // ─── Core execute helpers ──────────────────────────────────────────────────

  /**
   * Executes a prepared statement and returns all result rows.
   * Use for SELECT queries returning multiple rows.
   */
  protected async query<T extends mysql.RowDataPacket>(
    sql: string,
    values?: unknown[],
  ): Promise<T[]> {
    const [rows] = await this.getPool().execute<T[]>(sql, values);
    return rows;
  }

  /**
   * Executes a prepared statement and returns the first row or null.
   * Use for SELECT queries expecting a single record.
   */
  protected async queryOne<T extends mysql.RowDataPacket>(
    sql: string,
    values?: unknown[],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, values);
    return rows[0] ?? null;
  }

  /**
   * Executes a prepared statement and returns the first row.
   * Throws NotFoundError if no row is found.
   *
   * @param resourceName - Used in the NotFoundError message
   */
  protected async queryOneOrFail<T extends mysql.RowDataPacket>(
    sql: string,
    values: unknown[],
    resourceName: string,
  ): Promise<T> {
    const row = await this.queryOne<T>(sql, values);
    if (!row) throw new NotFoundError(resourceName);
    return row;
  }

  /**
   * Executes a mutating statement (INSERT, UPDATE, DELETE, CALL).
   * Returns the OkPacket / ResultSetHeader with `insertId`, `affectedRows`.
   */
  protected async mutate(
    sql: string,
    values?: unknown[],
  ): Promise<mysql.ResultSetHeader> {
    const [result] = await this.getPool().execute<mysql.ResultSetHeader>(sql, values);
    return result;
  }

  /**
   * Executes a mutating statement on a specific connection.
   * Used inside transactions to ensure the same connection is used.
   */
  protected async mutateOnConnection(
    connection: mysql.PoolConnection,
    sql: string,
    values?: unknown[],
  ): Promise<mysql.ResultSetHeader> {
    const [result] = await connection.execute<mysql.ResultSetHeader>(sql, values);
    return result;
  }

  /**
   * Executes a SELECT inside a transaction connection.
   */
  protected async queryOnConnection<T extends mysql.RowDataPacket>(
    connection: mysql.PoolConnection,
    sql: string,
    values?: unknown[],
  ): Promise<T[]> {
    const [rows] = await connection.execute<T[]>(sql, values);
    return rows;
  }

  // ─── Transaction helper ────────────────────────────────────────────────────

  /**
   * Runs a callback inside a DB transaction.
   * Commits on success, rolls back on error.
   *
   * INTEGRATION TEAM NOTE: changed from `protected` to `public`. The
   * established pattern across the business modules (see
   * hospitals.service.ts approveHospital/suspendHospital/reactivateHospital)
   * calls `this.repo.transaction(...)` from the *service* layer, outside
   * the repository class — `protected` would make that a compile error.
   * The method itself is a thin, safe wrapper around the shared
   * `withTransaction` helper, so there's no safety reason to restrict it
   * to subclass-only access.
   *
   * @example
   * const result = await this.repo.transaction(async (conn) => {
   *   await this.repo.someMethodOnConnection(conn, ...);
   *   return { id: conn.lastInsertId };
   * });
   */
  async transaction<T>(
    fn: (connection: mysql.PoolConnection) => Promise<T>,
  ): Promise<T> {
    return withTransaction(fn);
  }

  // ─── Soft-delete helpers ───────────────────────────────────────────────────

  /**
   * Soft-deletes a record by setting `deleted_at = NOW()`.
   *
   * @param table - Table name (validated against an allowlist in the caller)
   * @param id    - Primary key value
   */
  /**
   * INTEGRATION TEAM NOTE: changed from `protected` to `public` — same
   * reasoning as `transaction()` above. Called as `this.repo.softDelete(...)`
   * from hospitals.service.ts and users.service.ts, outside the repository
   * class.
   */
  async softDelete(table: string, id: number): Promise<boolean> {
    const result = await this.mutate(
      `UPDATE \`${table}\` SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    if (result.affectedRows === 0) {
      logger.warn('Soft delete — record not found or already deleted', {
        module: this.moduleName,
        table,
        id,
      });
      return false;
    }
    return true;
  }

  // ─── Count helper ──────────────────────────────────────────────────────────

  /**
   * Executes a COUNT(*) query and returns the number.
   * The SQL must return a single row with a `total` column.
   *
   * @example
   * const total = await this.count(
   *   'SELECT COUNT(*) AS total FROM referrals WHERE source_hospital_id = ?',
   *   [hospitalId],
   * );
   */
  protected async count(sql: string, values?: unknown[]): Promise<number> {
    interface CountRow extends mysql.RowDataPacket { total: number }
    const row = await this.queryOne<CountRow>(sql, values);
    return row?.total ?? 0;
  }
}
