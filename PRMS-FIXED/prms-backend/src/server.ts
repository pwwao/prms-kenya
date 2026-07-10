/**
 * Server Entry Point
 *
 * Architecture Contract §3.2 — server.ts calls createServer + listen.
 * Handles:
 *   - Application startup with dependency health checks
 *   - Route registration (business module routers plug in here)
 *   - Socket.IO initialisation
 *   - Graceful shutdown (SIGTERM / SIGINT)
 *   - PM2 ready signal
 *
 * Business module teams register their routers in the ROUTES SECTION below.
 */

import 'dotenv/config'; // Load .env before any other import

import { createApp, notFoundHandler, globalErrorHandler } from './app.js';
import { createHttpServer, startListening } from './config/server.config.js';
import { verifyDatabaseConnection, closeDatabasePool } from './config/database.config.js';
import { verifyRedisConnection, closeRedisConnections } from './config/redis.config.js';
import { closeQueues } from './shared/queue/queue.js';
import { logger } from './config/logger.config.js';

// Core Business Modules — Hospitals, Users, Patients, Referrals
import { registerBusinessModules } from './modules/index.js';

// Auth Module
import { authRouter } from './modules/auth/auth.routes.js';

// Communication Systems — Chat
import { chatRouter } from './modules/chat/chat.routes.js';
import { registerChatGateway } from './modules/chat/chat.gateway.js';

// Communication Systems — Notifications
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { NotificationsService } from './modules/notifications/notifications.service.js';
import {
  registerNotificationSubscriptions,
  noopEventContextResolver,
} from './modules/notifications/notifications.subscriber.js';
import {
  startNotificationWorkers,
  closeNotificationWorkers,
} from './modules/notifications/notifications.worker.js';
import { verifyEmailTransport } from './modules/notifications/channels/email.channel.js';

// Sync — Mobile offline sync endpoint
import { syncRouter } from './modules/sync/sync.routes.js';

// Reports — analytics endpoints
import { reportsRouter } from './modules/reports/reports.routes.js';

// Audit Logs — read endpoint
import { auditLogsRouter } from './modules/audit/audit.routes.js';

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('PRMS API Server bootstrapping...', { module: 'server' });

  // ── 1. Verify infrastructure connections ─────────────────────────────────
  await verifyDatabaseConnection();
  await verifyRedisConnection();

  // ── 2. Create Express app ────────────────────────────────────────────────
  const app = createApp();

  // ── 3. Register API v1 routes ────────────────────────────────────────────
  // Route registry — Architecture Contract §8.7 / OpenAPI v1.0

  // Auth — login, 2FA, refresh, logout, password management, device registration
  app.use('/api/v1/auth', authRouter);

  // Core Business Modules — Hospitals, Users, Patients, Referrals
  registerBusinessModules(app);

  // Communication Systems — Chat history REST endpoint (mounted under /referrals)
  app.use('/api/v1/referrals', chatRouter);

  // Communication Systems — Notifications inbox REST endpoints
  app.use('/api/v1/notifications', notificationsRouter);

  // Mobile offline sync endpoint
  app.use('/api/v1/sync', syncRouter);

  // Analytics / reporting endpoints
  app.use('/api/v1/reports', reportsRouter);

  // Audit log read endpoint (System Admin only)
  app.use('/api/v1/audit-logs', auditLogsRouter);

  // ── 4. Finalise middleware (must be AFTER routes) ────────────────────────
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  // ── 5. Create HTTP server + Socket.IO ────────────────────────────────────
  const { httpServer, io } = createHttpServer(app);

  // ── 6. Initialise Socket.IO namespaces ────────────────────────────────────
  // Register /chat namespace (JWT auth is handled inside BaseGateway)
  registerChatGateway(io);

  // Initialise Notification Service with Socket.IO server reference
  const notificationsService = new NotificationsService();
  notificationsService.setSocketServer(io);

  // Wire up Redis Pub/Sub event subscriber.
  //
  // Using noopEventContextResolver for now — see Integration Report §3
  // "Missing Components": a real resolver depends on
  // referral-participants.repository.ts and
  // UsersRepository.findActiveUserIdsByHospital(), neither of which exist
  // yet. Replace with a real IEventContextResolver implementation once
  // those land; until then, hospital-name lookups and participant fan-out
  // for push/email/SMS notifications will not resolve real data.
  registerNotificationSubscriptions(notificationsService, noopEventContextResolver);

  // Start BullMQ workers for FCM / SMS / Email delivery
  // NOTE: For production, move workers to a dedicated process:
  //   node dist/modules/notifications/notifications.worker.js
  // and call startNotificationWorkers() from that entry point only.
  startNotificationWorkers();

  // Verify SMTP transport at startup (non-blocking)
  verifyEmailTransport().catch(() => {/* logged inside verifyEmailTransport */});

  // Make io accessible on app for modules that need it
  app.set('io', io);

  // ── 7. Start listening ────────────────────────────────────────────────────
  await startListening(httpServer);

  // ── 8. Signal PM2 that the process is ready ───────────────────────────────
  if (process.send) {
    process.send('ready');
  }

  // ── 9. Register graceful shutdown handlers ────────────────────────────────
  const shutdown = createShutdownHandler(httpServer);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception — shutting down', {
      module: 'server',
      errorMessage: err.message,
      stack: err.stack,
    });
    shutdown().catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', {
      module: 'server',
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    // Do not exit — PM2 will handle restarts; log and continue
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

function createShutdownHandler(
  httpServer: import('http').Server,
): () => Promise<void> {
  let isShuttingDown = false;

  return async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Graceful shutdown initiated', { module: 'server' });

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed', { module: 'server' });
    });

    // Allow in-flight requests up to 10s (matches PM2 kill_timeout)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Close data layer connections
    await closeDatabasePool();
    await closeRedisConnections();
    await closeQueues();
    await closeNotificationWorkers();

    logger.info('Graceful shutdown complete', { module: 'server' });
    process.exit(0);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

bootstrap().catch((err: unknown) => {
  logger.error('Server failed to start', {
    module: 'server',
    errorMessage: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
