/**
 * Response Helper — Standard API Envelope Builder
 *
 * Architecture Contract §8.1 — ALL responses MUST use this envelope.
 * No module may return a raw object directly.
 */

import type { Response } from 'express';

// ─── Envelope Types ───────────────────────────────────────────────────────────

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IResponseMeta {
  timestamp: string;
  requestId: string;
  pagination?: IPagination;
}

export interface ISuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  meta: IResponseMeta;
}

export interface IErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{ field?: string; message: string }>;
  };
  meta: IResponseMeta;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildMeta(requestId: string, pagination?: IPagination): IResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId,
    ...(pagination ? { pagination } : {}),
  };
}

/**
 * Sends a successful JSON response.
 *
 * @param res       - Express Response object
 * @param data      - Payload to return in `data` field
 * @param message   - Human-readable success message
 * @param statusCode - HTTP status code (default 200)
 * @param pagination - Optional pagination metadata
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string,
  statusCode = 200,
  pagination?: IPagination,
): void {
  const requestId = (res.locals.requestId as string | undefined) ?? 'unknown';
  const body: ISuccessResponse<T> = {
    success: true,
    data,
    message,
    meta: buildMeta(requestId, pagination),
  };
  res.status(statusCode).json(body);
}

/**
 * Sends a 201 Created response.
 */
export function sendCreated<T>(res: Response, data: T, message: string): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Sends a 204 No Content response (no body).
 */
export function sendNoContent(res: Response): void {
  res.status(204).end();
}

/**
 * Sends an error JSON response.
 * Used by the global error handler — not called directly from business code.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: Array<{ field?: string; message: string }> = [],
): void {
  const requestId = (res.locals.requestId as string | undefined) ?? 'unknown';
  const body: IErrorResponse = {
    success: false,
    error: { code, message, details },
    meta: buildMeta(requestId),
  };
  res.status(statusCode).json(body);
}
