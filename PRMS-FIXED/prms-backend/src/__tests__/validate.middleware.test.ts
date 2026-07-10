/**
 * Validate Middleware — Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate, validateMany } from '../middleware/validate.middleware.js';
import { ValidationError } from '../shared/errors/domain.errors.js';
import type { Request, Response, NextFunction } from 'express';

function makeReq(body = {}, query = {}, params = {}): Request {
  return { body, query, params } as unknown as Request;
}
const res = {} as Response;

describe('validate middleware', () => {
  const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int().min(0) });

  it('calls next() with no error on valid body', () => {
    const req = makeReq({ name: 'Alice', age: 30 });
    const next = vi.fn() as unknown as NextFunction;
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('replaces req.body with parsed (coerced) value', () => {
    const req = makeReq({ name: 'Alice', age: '30' });
    const next = vi.fn() as unknown as NextFunction;
    validate(schema)(req, res, next);
    expect((req.body as { age: number }).age).toBe(30); // coerced string → number
  });

  it('strips unknown fields from body', () => {
    const req = makeReq({ name: 'Alice', age: 1, malicious: 'drop' });
    const next = vi.fn() as unknown as NextFunction;
    validate(schema)(req, res, next);
    expect((req.body as Record<string, unknown>).malicious).toBeUndefined();
  });

  it('calls next(ValidationError) on invalid body', () => {
    const req = makeReq({ name: 'A' }); // too short, missing age
    const next = vi.fn() as unknown as NextFunction;
    validate(schema)(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details.length).toBeGreaterThan(0);
  });

  it('validates query target', () => {
    const qSchema = z.object({ page: z.coerce.number().default(1) });
    const req = makeReq({}, { page: '3' });
    const next = vi.fn() as unknown as NextFunction;
    validate(qSchema, 'query')(req, res, next);
    expect((req.query as { page: number }).page).toBe(3);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('validateMany middleware', () => {
  it('validates both params and body, aggregates errors', () => {
    const schemas = {
      params: z.object({ id: z.coerce.number() }),
      body: z.object({ status: z.enum(['active', 'inactive']) }),
    };
    const req = makeReq({ status: 'bad' }, {}, { id: 'not-a-number' });
    const next = vi.fn() as unknown as NextFunction;
    validateMany(schemas)(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details.length).toBeGreaterThanOrEqual(2);
  });

  it('calls next() cleanly when all targets valid', () => {
    const schemas = {
      params: z.object({ id: z.coerce.number() }),
      body: z.object({ status: z.enum(['active', 'inactive']) }),
    };
    const req = makeReq({ status: 'active' }, {}, { id: '5' });
    const next = vi.fn() as unknown as NextFunction;
    validateMany(schemas)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
