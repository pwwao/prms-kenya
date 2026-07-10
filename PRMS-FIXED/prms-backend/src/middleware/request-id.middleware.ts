/**
 * Request ID Middleware
 *
 * Architecture Contract §8.4 — X-Request-ID header echoed in every response.
 * Generates a UUID v4 per request if not provided by the client.
 * Stored in res.locals.requestId for use by response helpers and loggers.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Attaches a request ID to every request/response cycle.
 * - Accepts client-provided X-Request-ID if it is a valid UUID v4.
 * - Generates a new UUID v4 if the header is absent or malformed.
 * - Echoes the ID back in the X-Request-ID response header.
 * - Exposes via `res.locals.requestId` for downstream use.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const clientId = req.headers['x-request-id'];
  const requestId =
    typeof clientId === 'string' && UUID_REGEX.test(clientId)
      ? clientId
      : uuidv4();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
