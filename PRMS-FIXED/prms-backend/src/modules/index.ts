/**
 * Business Module Registry
 *
 * Single mounting point for all Core Business Team modules.
 * Import this file in src/server.ts, inside bootstrap(), in the
 * "Register API v1 routes" section (after createApp() returns, per
 * app.ts §9 — routes are registered externally, not inside the app factory):
 *
 *   import { registerBusinessModules } from './modules/index.js';
 *   registerBusinessModules(app);
 */

import type { Express } from 'express';
import hospitalRoutes from './hospitals/hospitals.routes.js';
import userRoutes     from './users/users.routes.js';
import patientRoutes  from './patients/patients.routes.js';
import referralRoutes from './referrals/referrals.routes.js';

const API_PREFIX = '/api/v1';

export function registerBusinessModules(app: Express): void {
  app.use(`${API_PREFIX}/hospitals`, hospitalRoutes);   // Module 1, 7, 8
  app.use(`${API_PREFIX}/users`,     userRoutes);       // Module 2, 10
  app.use(`${API_PREFIX}/patients`,  patientRoutes);    // Module 3, 9, 10
  app.use(`${API_PREFIX}/referrals`, referralRoutes);   // Module 4, 5, 6
}
