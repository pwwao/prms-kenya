/**
 * Backend Platform — Unit Tests
 *
 * Tests for: error classes, response helper, pagination, crypto service,
 * hash service, RBAC middleware, validate middleware, request-id middleware.
 *
 * Infrastructure tests (DB, Redis, JWT with keys) use integration tests
 * in separate files with testcontainers or mocks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Error classes ────────────────────────────────────────────────────────────

import { AppError } from '../shared/errors/app.error.js';
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InvalidStateError,
  EncryptionError,
  ExternalServiceError,
} from '../shared/errors/domain.errors.js';

describe('Error classes', () => {
  it('AppError carries statusCode, code, details', () => {
    const err = new AppError('oops', 400, 'VALIDATION_ERROR', [{ field: 'x', message: 'bad' }]);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toHaveLength(1);
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('ValidationError defaults to HTTP 400', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('AuthError defaults to HTTP 401', () => {
    const err = new AuthError('invalid token');
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError defaults to HTTP 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('NotFoundError is HTTP 404', () => {
    const err = new NotFoundError('Referral');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('Referral');
  });

  it('ConflictError is HTTP 409', () => {
    expect(new ConflictError('dup').statusCode).toBe(409);
  });

  it('InvalidStateError is HTTP 422', () => {
    expect(new InvalidStateError('bad transition').statusCode).toBe(422);
  });

  it('EncryptionError is non-operational HTTP 500', () => {
    const err = new EncryptionError('encrypt');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('ENCRYPTION_FAILURE');
    expect(err.isOperational).toBe(false);
  });

  it('ExternalServiceError is HTTP 503', () => {
    expect(new ExternalServiceError('FCM').statusCode).toBe(503);
    expect(new ExternalServiceError('SMS').code).toBe('EXTERNAL_SERVICE_SMS_UNAVAILABLE');
    expect(new ExternalServiceError('EMAIL').code).toBe('EXTERNAL_SERVICE_EMAIL_UNAVAILABLE');
  });
});

// ─── Response helper ──────────────────────────────────────────────────────────

import { sendSuccess, sendCreated, sendError } from '../shared/response.helper.js';
import type { Response } from 'express';

function mockRes(requestId = 'test-req-id'): Response {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { status, json, locals: { requestId }, end: vi.fn() } as unknown as Response;
}

describe('Response helper', () => {
  it('sendSuccess builds correct envelope', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
    expect(body.message).toBe('created');
    expect(body.meta.requestId).toBe('test-req-id');
    expect(typeof body.meta.timestamp).toBe('string');
  });

  it('sendError builds correct error envelope', () => {
    const res = mockRes();
    sendError(res, 400, 'VALIDATION_ERROR', 'bad input', [{ field: 'name', message: 'required' }]);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toHaveLength(1);
  });
});

// ─── Pagination helper ────────────────────────────────────────────────────────

import { buildPagination, parsePagination, safeSortBy } from '../shared/pagination.helper.js';
import type { Request } from 'express';

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

describe('Pagination helper', () => {
  it('buildPagination computes totalPages and hasNext/hasPrev', () => {
    const p = buildPagination(2, 20, 150);
    expect(p.totalPages).toBe(8);
    expect(p.hasNext).toBe(true);
    expect(p.hasPrev).toBe(true);
  });

  it('buildPagination on last page has no next', () => {
    const p = buildPagination(8, 20, 150);
    expect(p.hasNext).toBe(false);
    expect(p.hasPrev).toBe(true);
  });

  it('parsePagination applies defaults', () => {
    const params = parsePagination(mockReq({}));
    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
    expect(params.offset).toBe(0);
    expect(params.sortOrder).toBe('desc');
  });

  it('parsePagination computes correct offset', () => {
    const params = parsePagination(mockReq({ page: '3', limit: '10' }));
    expect(params.offset).toBe(20);
  });

  it('safeSortBy rejects columns not in allowlist', () => {
    const result = safeSortBy('malicious; DROP TABLE', ['created_at', 'updated_at'], 'created_at');
    expect(result).toBe('created_at');
  });

  it('safeSortBy accepts valid column', () => {
    expect(safeSortBy('updated_at', ['created_at', 'updated_at'], 'created_at')).toBe('updated_at');
  });
});

// ─── RBAC — authorize middleware ──────────────────────────────────────────────

import { authorize, requirePermission, assertFacilityAccess, hasPermission } from '../middleware/authorize.middleware.js';
import type { NextFunction } from 'express';

function makeUser(role: string, hospitalId: number | null = 1) {
  return { userId: 1, role, hospitalId, jti: 'jti', exp: 9999999999 };
}

describe('RBAC — authorize middleware', () => {
  it('calls next() when role is allowed', () => {
    const req = { user: makeUser('Clinician') } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authorize(['Clinician'])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(ForbiddenError) when role is not allowed', () => {
    const req = { user: makeUser('Receptionist') } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authorize(['Clinician'])(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('calls next(ForbiddenError) when req.user is missing', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    authorize(['System Admin'])(req, res, next);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});

describe('RBAC — requirePermission middleware', () => {
  it('allows System Admin to view audit logs', () => {
    const req = { user: makeUser('System Admin', null) } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    requirePermission('audit:view')(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks Clinician from viewing audit logs', () => {
    const req = { user: makeUser('Clinician') } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    requirePermission('audit:view')(req, {} as Response, next);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});

describe('RBAC — facility isolation', () => {
  it('System Admin can access any hospital', () => {
    expect(() => assertFacilityAccess({ role: 'System Admin', hospitalId: null }, 99)).not.toThrow();
  });

  it('Clinician cannot access different hospital', () => {
    expect(() => assertFacilityAccess({ role: 'Clinician', hospitalId: 1 }, 2)).toThrow(ForbiddenError);
  });

  it('Clinician can access own hospital', () => {
    expect(() => assertFacilityAccess({ role: 'Clinician', hospitalId: 5 }, 5)).not.toThrow();
  });
});

describe('hasPermission utility', () => {
  it('Receptionist cannot create referrals', () => {
    expect(hasPermission('Receptionist', 'referral:create')).toBe(false);
  });

  it('Clinician can create referrals', () => {
    expect(hasPermission('Clinician', 'referral:create')).toBe(true);
  });

  it('Hospital Admin cannot access audit logs', () => {
    expect(hasPermission('Hospital Admin', 'audit:view')).toBe(false);
  });
});

// ─── Request ID middleware ────────────────────────────────────────────────────

import { requestIdMiddleware } from '../middleware/request-id.middleware.js';

describe('requestIdMiddleware', () => {
  it('generates a UUID when header is absent', () => {
    const req = { headers: {} } as Request;
    const res = { locals: {}, setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(res.locals.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(next).toHaveBeenCalled();
  });

  it('accepts a valid client-provided UUID', () => {
    const clientId = '550e8400-e29b-41d4-a716-446655440000';
    const req = { headers: { 'x-request-id': clientId } } as unknown as Request;
    const res = { locals: {}, setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestIdMiddleware(req, res, next);
    expect(res.locals.requestId).toBe(clientId);
  });

  it('replaces a malformed client ID with a new UUID', () => {
    const req = { headers: { 'x-request-id': 'not-a-uuid' } } as unknown as Request;
    const res = { locals: {}, setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestIdMiddleware(req, res, next);
    expect(res.locals.requestId).not.toBe('not-a-uuid');
    expect(res.locals.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
