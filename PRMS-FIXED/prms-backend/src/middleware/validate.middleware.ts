/**
 * Validation Middleware — Zod Schema Enforcement
 *
 * Architecture Contract §6.1 — "Zod parsing" not type assertions.
 * §8.1 — Validation failures return HTTP 400 with VALIDATION_ERROR code.
 * §10.6 A03 — "Prepared statements only; Zod validation on all inputs."
 *
 * Use the `validate` factory to create per-route validation middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors/domain.errors.js';
import type { IErrorDetail } from '../shared/errors/app.error.js';

// ─── Target selectors ─────────────────────────────────────────────────────────

type TValidationTarget = 'body' | 'query' | 'params';

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Creates a validation middleware that parses and validates request data
 * against a Zod schema. Replaces the original data with the parsed result
 * (strips unknown fields, applies defaults, coerces types).
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (default: 'body')
 *
 * @example
 * router.post('/patients', authenticate, validate(createPatientSchema), handler);
 * router.get('/patients', authenticate, validate(listPatientsSchema, 'query'), handler);
 */
export function validate(schema: ZodSchema, target: TValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details: IErrorDetail[] = formatZodErrors(result.error);
      return next(new ValidationError('Validation failed for request', details));
    }

    // Replace with parsed value (typed, defaults applied, unknowns stripped)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (req as any)[target] = result.data;
    next();
  };
}

/**
 * Validates multiple targets in a single middleware (body + query, etc.).
 *
 * @example
 * router.get('/referrals/:referralId/messages',
 *   authenticate,
 *   validateMany({ params: referralIdSchema, query: listQuerySchema }),
 *   handler,
 * );
 */
export function validateMany(schemas: Partial<Record<TValidationTarget, ZodSchema>>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allDetails: IErrorDetail[] = [];

    for (const [target, schema] of Object.entries(schemas) as [TValidationTarget, ZodSchema][]) {
      const result = schema.safeParse(req[target]);
      if (!result.success) {
        allDetails.push(...formatZodErrors(result.error));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (req as any)[target] = result.data;
      }
    }

    if (allDetails.length > 0) {
      return next(new ValidationError('Validation failed for request', allDetails));
    }

    next();
  };
}

// ─── Zod error formatter ──────────────────────────────────────────────────────

/**
 * Converts a ZodError into the standard IErrorDetail array.
 * Architecture Contract §8.1 error response format.
 */
function formatZodErrors(error: ZodError): IErrorDetail[] {
  return error.errors.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: issue.message,
  }));
}
