/**
 * Database Configuration — MySQL2 Connection Pool
 *
 * Provides primary (read-write) and replica (read-only) pool instances.
 * Architecture Contract §9.1 — Pool settings, prepared statements only.
 */

import mysql from 'mysql2/promise';
import { env } from './env.config.js';
import { logger } from './logger.config.js';

// ─── Pool Options ─────────────────────────────────────────────────────────────

const basePoolConfig: mysql.PoolOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  // Pool sizing — Architecture Contract §9.1
  connectionLimit: env.DB_POOL_MAX,
  waitForConnections: true,
  queueLimit: 0,
  // Timeouts (ms)
  connectTimeout: 10_000,
  // Character set — utf8mb4 for full Unicode support
  charset: 'utf8mb4',
  // Timezone — store in UTC, convert in application layer
  timezone: '+00:00',
  // Enable named placeholders: execute('SELECT * FROM users WHERE id = :id', { id: 1 })
  namedPlaceholders: true,
  // Return dates as strings to avoid timezone conversion issues
  dateStrings: false,
  // Prepared statements via execute() — critical for SQL injection prevention
  // Architecture Contract §9.2: "All queries use prepared statements"
  supportBigNumbers: true,
  bigNumberStrings: false,
};

// ─── Primary Pool (read-write) ────────────────────────────────────────────────

let primaryPool: mysql.Pool | null = null;

/**
 * Returns the primary (read-write) connection pool.
 * Lazily initialised on first call.
 */
export function getPrimaryPool(): mysql.Pool {
  if (!primaryPool) {
    primaryPool = mysql.createPool(basePoolConfig);

    primaryPool.on('connection', (connection) => {
      logger.debug('New DB connection established', {
        module: 'database',
        threadId: connection.threadId,
      });
    });

    primaryPool.on('error', (err) => {
      logger.error('DB pool error', {
        module: 'database',
        action: 'POOL_ERROR',
        errorMessage: err.message,
      });
    });
  }

  return primaryPool;
}

/**
 * Returns a connection from the primary pool.
 * Caller MUST release: `connection.release()`.
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  return getPrimaryPool().getConnection();
}

/**
 * Executes a prepared statement on the primary pool.
 * Use for all mutating queries (INSERT, UPDATE, DELETE, CALL).
 *
 * @param sql    - SQL with `?` or `:namedParam` placeholders
 * @param values - Array of values or named object
 */
export async function execute<T extends mysql.RowDataPacket[] | mysql.OkPacket | mysql.ResultSetHeader>(
  sql: string,
  values?: unknown[] | Record<string, unknown>,
): Promise<[T, mysql.FieldPacket[]]> {
  return getPrimaryPool().execute<T>(sql, values);
}

/**
 * Executes a query within a transaction.
 * Automatically commits on success or rolls back on error.
 *
 * @param fn - Callback that receives the transaction connection
 */
export async function withTransaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getConnection();
  await connection.beginTransaction();
  try {
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verifies the database connection is healthy.
 * Called during application startup.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  const connection = await getConnection();
  try {
    await connection.ping();
    logger.info('Database connection verified', { module: 'database' });
  } finally {
    connection.release();
  }
}

/**
 * Gracefully closes all database pool connections.
 * Called during application shutdown.
 */
export async function closeDatabasePool(): Promise<void> {
  if (primaryPool) {
    await primaryPool.end();
    primaryPool = null;
    logger.info('Database pool closed', { module: 'database' });
  }
}
