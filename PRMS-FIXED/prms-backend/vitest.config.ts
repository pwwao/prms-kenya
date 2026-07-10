/**
 * Vitest Configuration — Backend Test Suite
 * Architecture Contract §14.3 — ≥80% coverage threshold
 *
 * Standardised on Vitest across the merged repo (Integration Team decision,
 * see PRMS_Integration_Report.md §2 item 7). All test code actually
 * submitted by Backend Platform, Business Modules, Communication, and
 * DevOps/QA teams was already written against Vitest or framework-agnostic
 * bare globals — only the original jest.config.ts/package.json scaffolding
 * specified Jest, so this replaces that scaffolding rather than the tests.
 *
 * `globals: true` is required so the four Core Business Modules test files
 * (hospitals/patients/referrals/users.test.ts), which call describe/it/expect
 * without importing them, continue to work unmodified.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ── Environment ───────────────────────────────────────────────────────────
    environment: 'node',
    globals: true,

    // ── File patterns ─────────────────────────────────────────────────────────
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [
      'tests/e2e/**',
      'tests/load/**',
      'node_modules/**',
      'dist/**',
    ],

    // ── Timeout ───────────────────────────────────────────────────────────────
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // ── Coverage ──────────────────────────────────────────────────────────────
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/database/migrations/**',
        'src/database/seeds/**',
        'src/server.ts',
        'src/**/__tests__/**',
      ],
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   80,
        statements: 80,
      },
      // Fail CI if any single file drops below threshold
      perFile: false,
    },

    // ── Reporters ─────────────────────────────────────────────────────────────
    reporters: process.env.CI
      ? ['verbose', 'github-actions', 'json']
      : ['verbose'],
    outputFile: {
      json: './test-results/results.json',
    },

    // ── Setup ─────────────────────────────────────────────────────────────────
    setupFiles: ['./tests/helpers/vitest-setup.ts'],

    // ── Parallelism ───────────────────────────────────────────────────────────
    // Integration tests modify shared DB state — run serially per file
    // Unit tests can run in parallel
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // ── Retry on flaky tests (CI only) ────────────────────────────────────────
    retry: process.env.CI ? 2 : 0,
  },
});
