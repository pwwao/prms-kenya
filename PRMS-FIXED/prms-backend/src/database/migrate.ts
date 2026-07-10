/**
 * Database Migration Runner
 *
 * Architecture Contract §9.3 — Sequential migrations, migration_history table.
 * Reads SQL files from src/database/migrations/ and executes them in order.
 * Tracks applied migrations to ensure idempotency.
 *
 * NOTE (Integration Team fix): the original implementation split each file's
 * SQL on `/;\s*\n/` before executing each statement individually. This
 * breaks on any file containing a DELIMITER $$ block (triggers, stored
 * procedures) — semicolons inside a trigger/procedure body are not
 * statement terminators, only the final `$$` is, so the naive split
 * fragments compound statement bodies into invalid SQL.
 *
 * Fixed by using a dedicated connection with `multipleStatements: true`
 * (mysql2 driver feature — MySQL's protocol then correctly parses
 * BEGIN...END blocks natively, no manual delimiter handling needed) and
 * stripping `DELIMITER` directives, which are a mysql-cli-only convention
 * the driver doesn't understand and doesn't need.
 *
 * This dedicated connection is intentionally separate from the shared
 * application pool in database.config.ts, which correctly keeps
 * multipleStatements disabled (Architecture Contract §9.2 — prepared
 * statements only, to avoid widening the app's SQL-injection surface).
 * Only this trusted, developer-authored migration runner gets the
 * multi-statement connection, never request-handling code.
 */

import 'dotenv/config'; // Load .env before any other import — must be first
import { readdir, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.config.js';
import { verifyDatabaseConnection, closeDatabasePool } from '../config/database.config.js';
import { logger } from '../config/logger.config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface IMigrationRow {
  migration: string;
  checksum: string;
}

/**
 * Strips `DELIMITER xxx` lines and replaces the custom delimiter back to
 * `;` so the file is plain, valid multi-statement SQL for the driver.
 * mysql-cli's DELIMITER is purely a client-side parsing convention; the
 * server (and mysql2 with multipleStatements) never needed it.
 */
function stripDelimiterDirectives(sql: string): string {
  const lines = sql.split('\n');
  let customDelimiter = ';';
  const out: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^DELIMITER\s+(\S+)$/i);
    if (match) {
      customDelimiter = match[1]!;
      continue; // drop the DELIMITER directive itself
    }
    if (customDelimiter !== ';') {
      // Replace the custom delimiter with a real semicolon, but only at
      // end-of-statement occurrences (the custom delimiter only ever
      // appears as a standalone terminator, e.g. "END$$").
      out.push(line.split(customDelimiter).join(';'));
    } else {
      out.push(line);
    }
  }

  return out.join('\n');
}

async function ensureMigrationHistoryTable(connection: mysql.Connection): Promise<void> {
  // Bootstrap: migration_history itself is created by
  // 000_create_migration_history.sql, but getAppliedMigrations() needs to
  // query it before that file has necessarily run on a brand-new database.
  // CREATE TABLE IF NOT EXISTS is idempotent, so running this here and
  // then letting 000_create_migration_history.sql run normally (and get
  // recorded as applied) is safe either way.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
        id            INT            NOT NULL AUTO_INCREMENT,
        migration     VARCHAR(255)   NOT NULL,
        executed_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum      VARCHAR(64)    NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migration_history_migration (migration)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(connection: mysql.Connection): Promise<Set<string>> {
  const [rows] = await connection.execute<(IMigrationRow & mysql.RowDataPacket)[]>(
    'SELECT migration FROM migration_history ORDER BY id',
  );
  return new Set(rows.map((r) => r.migration));
}

async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations', { module: 'migrate' });

  await verifyDatabaseConnection();

  // Dedicated single connection (not from the app pool) with
  // multipleStatements enabled — see module doc comment above for why.
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    charset: 'utf8mb4',
    timezone: '+00:00',
    multipleStatements: true,
  });

  try {
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexicographic order — 001_, 002_, etc.

    const applied = await ensureMigrationHistoryTable(connection).then(() => getAppliedMigrations(connection));

    let ran = 0;
    for (const file of files) {
      const name = file.replace('.sql', '');

      if (applied.has(name)) {
        logger.debug(`Skipping already-applied migration: ${name}`, { module: 'migrate' });
        continue;
      }

      const rawSql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
      const checksum = createHash('sha256').update(rawSql).digest('hex');
      const sql = stripDelimiterDirectives(rawSql);

      logger.info(`Applying migration: ${name}`, { module: 'migrate' });

      await connection.beginTransaction();
      try {
        // multipleStatements:true lets the driver send the whole file as
        // one protocol round-trip; MySQL parses BEGIN...END bodies
        // correctly on its own, no manual statement splitting needed.
        if (sql.trim().length > 0) {
          await connection.query(sql);
        }

        await connection.execute(
          'INSERT INTO migration_history (migration, checksum) VALUES (?, ?)',
          [name, checksum],
        );

        await connection.commit();
        ran++;
        logger.info(`Migration applied: ${name}`, { module: 'migrate' });
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    }

    if (ran === 0) {
      logger.info('All migrations already applied — database is up to date', { module: 'migrate' });
    } else {
      logger.info(`Applied ${ran} migration(s) successfully`, { module: 'migrate' });
    }
  } finally {
    await connection.end();
    await closeDatabasePool();
  }
}

// Entry point when run directly
runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Migration failed', {
      module: 'migrate',
      errorMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  });
