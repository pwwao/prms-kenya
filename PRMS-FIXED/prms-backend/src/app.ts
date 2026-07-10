/**
 * Express Application Factory
 *
 * Architecture Contract §3.2 — app.ts is the Express app factory (no listen call).
 * server.ts is the entry point that calls createServer + listen.
 *
 * Registers all global middleware in the correct order:
 *   1. Security headers (Helmet)
 *   2. CORS
 *   3. Request ID
 *   4. Morgan HTTP logging
 *   5. Body parsing
 *   6. Compression
 *   7. Global rate limiter
 *   8. API router (v1)
 *   9. 404 handler
 *  10. Global error handler
 */

import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { getAllowedOrigins, isProduction } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { defaultApiRateLimiter } from './middleware/rate-limit.middleware.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';

// ─── App factory ──────────────────────────────────────────────────────────────

export function createApp(): Express {
  const app = express();

  // ── 1. Security headers — OWASP A05 ────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProduction()
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false, // disabled in dev for Swagger UI
      crossOriginEmbedderPolicy: isProduction(),
    }),
  );

  // ── 2. CORS — whitelist only ─────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed = getAllowedOrigins();
        // Allow requests with no origin (mobile apps, curl, Postman in dev)
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' is not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining'],
      maxAge: 600, // preflight cache 10 min
    }),
  );

  // ── 3. Request ID ────────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── 4. HTTP access logging (Morgan → Winston) ────────────────────────────────
  app.use(
    morgan(isProduction() ? 'combined' : 'dev', {
      stream: {
        write: (message: string) => {
          logger.http(message.trim(), { module: 'http' });
        },
      },
      skip: (req) => req.path === '/health',
    }),
  );

  // ── 5. Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── 6. Compression ────────────────────────────────────────────────────────────
  app.use(compression());

  // ── 7. Global rate limiter (authenticated routes) ────────────────────────────
  // Individual auth-route limiters are applied inside auth.routes.ts
  app.use('/api/', defaultApiRateLimiter);

  // ── 8. Health check (no auth, no rate limit) ─────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── 9. API v1 routes — registered by server.ts after module init ─────────────
  // Routes are registered externally via app.use('/api/v1', router)
  // to allow business module teams to inject their own routers.

  // ── 10. 404 + Global error handler — registered last ─────────────────────────
  // These are added AFTER routes in server.ts using app.use(notFoundHandler)
  // and app.use(globalErrorHandler). Kept here as named exports for server.ts.

  return app;
}

// Re-export for server.ts to register after routes
export { notFoundHandler, globalErrorHandler };
