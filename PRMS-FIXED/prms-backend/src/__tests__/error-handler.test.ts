/**
 * Global Error Handler — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { globalErrorHandler, notFoundHandler } from '../middleware/error-handler.middleware.js';
import {
  ValidationError,
  AuthError,
  NotFoundError,
  EncryptionError,
} from '../shared/errors/domain.errors.js';

function mockRes(): Response {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { status, json, locals: { requestId: 'test-id' } } as unknown as Response;
}

const mockReq = { method: 'GET', path: '/test', user: undefined, headers: {} } as unknown as Request;
const next = vi.fn() as unknown as NextFunction;

describe('globalErrorHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles ValidationError → 400', () => {
    const res = mockRes();
    globalErrorHandler(new ValidationError('bad input', [{ field: 'x', message: 'req' }]), mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toHaveLength(1);
  });

  it('handles AuthError → 401', () => {
    const res = mockRes();
    globalErrorHandler(new AuthError('expired', 'AUTH_TOKEN_EXPIRED'), mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error.code).toBe('AUTH_TOKEN_EXPIRED');
  });

  it('handles NotFoundError → 404', () => {
    const res = mockRes();
    globalErrorHandler(new NotFoundError('Referral'), mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('handles EncryptionError → 500', () => {
    const res = mockRes();
    globalErrorHandler(new EncryptionError('encrypt'), mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles unknown Error → 500', () => {
    const res = mockRes();
    globalErrorHandler(new Error('boom'), mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('handles MySQL duplicate entry error → 409', () => {
    const res = mockRes();
    const mysqlErr = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
    globalErrorHandler(mysqlErr, mockReq, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error.code).toBe('RESOURCE_ALREADY_EXISTS');
  });
});

describe('notFoundHandler', () => {
  it('calls next() with 404 AppError', () => {
    const next = vi.fn() as unknown as NextFunction;
    notFoundHandler(mockReq, mockRes(), next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('RESOURCE_NOT_FOUND');
  });
});
