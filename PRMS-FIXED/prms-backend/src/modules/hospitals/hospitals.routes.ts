/**
 * Hospitals Router
 *
 * Architecture Contract §10.3 Permission Matrix:
 * - System Admin : full CRUD, approve, suspend, reactivate
 * - Hospital Admin: register, view own, update own
 * - Clinician / Receptionist: view own hospital only
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize, requirePermission } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { HospitalController } from './hospitals.controller.js';
import { HospitalService } from './hospitals.service.js';
import { HospitalRepository } from './hospitals.repository.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  createHospitalSchema,
  updateHospitalSchema,
  listHospitalsQuerySchema,
  approveHospitalSchema,
  suspendHospitalSchema,
  reactivateHospitalSchema,
  updateHospitalStatusSchema,
  hospitalIdParamSchema,
} from './hospitals.validator.js';

// ─── Dependency wiring ────────────────────────────────────────────────────────

const repo       = new HospitalRepository();
const cache      = new CacheService();
const service    = new HospitalService(repo, cache);
const controller = new HospitalController(service);

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// POST /api/v1/hospitals
// NOTE: OpenAPI v1.0 and the Architecture Contract mark this endpoint Public
// (no auth) — a new facility's first user has no account yet, so a Public
// registration endpoint resolves that chicken-and-egg problem. This
// implementation instead requires authentication. Left as-is rather than
// silently changed, since removing `authenticate` is a real access-control
// decision that needs explicit confirmation of the intended onboarding flow,
// not a unilateral fix. See PRMS_Integration_Report.md §2 item 3.
router.post(
  '/',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  requirePermission('hospital:register'),
  validate(createHospitalSchema),
  auditLog({ actionType: 'CREATE_HOSPITAL', resourceType: 'hospital' }),
  controller.create,
);

// GET /api/v1/hospitals
router.get(
  '/',
  authenticate,
  validate(listHospitalsQuerySchema, 'query'),
  controller.list,
);

// GET /api/v1/hospitals/:hospitalId
router.get(
  '/:hospitalId',
  authenticate,
  validate(hospitalIdParamSchema, 'params'),
  controller.getById,
);

// PATCH /api/v1/hospitals/:hospitalId
router.patch(
  '/:hospitalId',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(hospitalIdParamSchema, 'params'),
  validate(updateHospitalSchema),
  auditLog({ actionType: 'UPDATE_HOSPITAL', resourceType: 'hospital' }),
  controller.update,
);

// DELETE /api/v1/hospitals/:hospitalId
router.delete(
  '/:hospitalId',
  authenticate,
  authorize(['System Admin']),
  validate(hospitalIdParamSchema, 'params'),
  auditLog({ actionType: 'DELETE_HOSPITAL', resourceType: 'hospital' }),
  controller.delete,
);

// PATCH /api/v1/hospitals/:hospitalId/status — OpenAPI v1.0 / web client
// Unified status transition: Approved, Suspended, or Pending (reactivate)
router.patch(
  '/:hospitalId/status',
  authenticate,
  authorize(['System Admin']),
  requirePermission('hospital:approve'),
  validate(hospitalIdParamSchema, 'params'),
  validate(updateHospitalStatusSchema),
  auditLog({ actionType: 'UPDATE_HOSPITAL_STATUS', resourceType: 'hospital' }),
  controller.updateStatus,
);

// POST /api/v1/hospitals/:hospitalId/approve
router.post(
  '/:hospitalId/approve',
  authenticate,
  authorize(['System Admin']),
  requirePermission('hospital:approve'),
  validate(hospitalIdParamSchema, 'params'),
  validate(approveHospitalSchema),
  auditLog({ actionType: 'APPROVE_HOSPITAL', resourceType: 'hospital' }),
  controller.approve,
);

// POST /api/v1/hospitals/:hospitalId/suspend
router.post(
  '/:hospitalId/suspend',
  authenticate,
  authorize(['System Admin']),
  requirePermission('hospital:approve'),
  validate(hospitalIdParamSchema, 'params'),
  validate(suspendHospitalSchema),
  auditLog({ actionType: 'SUSPEND_HOSPITAL', resourceType: 'hospital' }),
  controller.suspend,
);

// POST /api/v1/hospitals/:hospitalId/reactivate
router.post(
  '/:hospitalId/reactivate',
  authenticate,
  authorize(['System Admin']),
  requirePermission('hospital:approve'),
  validate(hospitalIdParamSchema, 'params'),
  validate(reactivateHospitalSchema),
  auditLog({ actionType: 'REACTIVATE_HOSPITAL', resourceType: 'hospital' }),
  controller.reactivate,
);

// GET /api/v1/hospitals/:hospitalId/approval-history
router.get(
  '/:hospitalId/approval-history',
  authenticate,
  authorize(['System Admin']),
  validate(hospitalIdParamSchema, 'params'),
  controller.approvalHistory,
);

export default router;
