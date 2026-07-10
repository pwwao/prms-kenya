/**
 * Server Configuration — Express + Socket.IO factory
 *
 * Creates and configures the HTTP server with Socket.IO attached.
 * Architecture Contract §1.1 — Socket.IO v4 over WSS.
 */

import { createServer, type Server as HttpServer } from 'http';
import { Server as SocketIOServer, type ServerOptions } from 'socket.io';
import { type Express } from 'express';
import { env, getAllowedOrigins } from './env.config.js';
import { logger } from './logger.config.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IServerInstance {
  httpServer: HttpServer;
  io: SocketIOServer;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates an HTTP server with Socket.IO attached to the Express app.
 * Called once in server.ts — never called in tests (use app directly).
 */
export function createHttpServer(app: Express): IServerInstance {
  const httpServer = createServer(app);

  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Ping interval / timeout for connection health
    pingInterval: 10_000,
    pingTimeout: 5_000,
    // Allow upgrades from polling → websocket
    allowUpgrades: true,
    // Per-message compression
    perMessageDeflate: {
      threshold: 2048,
    },
  };

  const io = new SocketIOServer(httpServer, socketOptions);

  io.engine.on('connection_error', (err) => {
    logger.warn('Socket.IO connection error', {
      module: 'socket',
      errorMessage: (err as Error).message,
    });
  });

  return { httpServer, io };
}

/**
 * Starts the HTTP server listening on the configured port.
 * Returns a promise that resolves when the server is ready.
 */
export function startListening(httpServer: HttpServer): Promise<void> {
  return new Promise((resolve) => {
    httpServer.listen(env.PORT, () => {
      logger.info(`PRMS API server started`, {
        module: 'server',
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        pid: process.pid,
      });
      resolve();
    });
  });
}
