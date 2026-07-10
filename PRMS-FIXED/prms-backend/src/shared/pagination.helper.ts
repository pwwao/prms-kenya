/**
 * Pagination Helper
 *
 * Architecture Contract §8.3 — `?page=1&limit=20&sortBy=created_at`
 * Parses and validates pagination query parameters.
 */

import type { Request } from 'express';
import { z } from 'zod';
import type { IPagination } from './response.helper.js';

// ─── Schema ───────────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IPaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses and validates pagination query params from an Express request.
 * Falls back to safe defaults on invalid input rather than throwing.
 */
export function parsePagination(req: Request): IPaginationParams {
  const parsed = paginationSchema.safeParse(req.query);
  const data = parsed.success ? parsed.data : paginationSchema.parse({});
  return {
    page: data.page,
    limit: Math.trunc(data.limit),
  offset: Math.trunc((data.page - 1) * data.limit),
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
  };
}

/**
 * Builds the pagination metadata block for the response envelope.
 *
 * @param page       - Current page number
 * @param limit      - Items per page
 * @param total      - Total row count (from COUNT(*) query)
 */
export function buildPagination(page: number, limit: number, total: number): IPagination {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Validates a sortBy column against an allowlist.
 * Prevents SQL injection via ORDER BY clause.
 *
 * @param sortBy   - Client-supplied column name
 * @param allowed  - Allowlist of valid column names
 * @param fallback - Default column if sortBy is not in the list
 */
export function safeSortBy(
  sortBy: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  if (!sortBy || !allowed.includes(sortBy)) return fallback;
  return sortBy;
}
