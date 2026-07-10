/**
 * Referrals Router
 *
 * Architecture Contract §10.3 Permission Matrix:
 * - System Admin    : read-only on referrals; can force any transition
 * - Hospital Admin  : full access within own hospital
 * - Clinician       : create, update (Draft), transition
 * - Receptionist    : dispatch, mark received only
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize, requirePermission } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { ReferralController } from './referrals.controller.js';
import { ReferralService } from './referrals.service.js';
import { ReferralRepository } from './referrals.repository.js';
import { PatientRepository } from '../patients/patients.repository.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  createReferralSchema,
  updateReferralSchema,
  transitionStatusSchema,
  listReferralsQuerySchema,
  referralCodeParamSchema,
  referralIdParamSchema,
} from './referrals.validator.js';

// ─── Dependency wiring ────────────────────────────────────────────────────────

const repo          = new ReferralRepository();
const patientRepo   = new PatientRepository();
const hospitalRepo  = new HospitalRepository();
const cache         = new CacheService();
const service       = new ReferralService(repo, patientRepo, hospitalRepo, cache);
const controller    = new ReferralController(service);

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// POST /api/v1/referrals
router.post(
  '/',
  authenticate,
  authorize(['Hospital Admin', 'Clinician']),
  requirePermission('referral:create'),
  validate(createReferralSchema),
  auditLog({ actionType: 'CREATE_REFERRAL', resourceType: 'referral' }),
  controller.create,
);

// GET /api/v1/referrals
router.get(
  '/',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(listReferralsQuerySchema, 'query'),
  controller.list,
);

// GET /api/v1/referrals/code/:code  — must be before /:referralId
router.get(
  '/code/:code',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(referralCodeParamSchema, 'params'),
  controller.getByCode,
);

// GET /api/v1/referrals/:referralId
router.get(
  '/:referralId',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(referralIdParamSchema, 'params'),
  auditLog({ actionType: 'VIEW_REFERRAL', resourceType: 'referral' }),
  controller.getById,
);

// PATCH /api/v1/referrals/:referralId
router.patch(
  '/:referralId',
  authenticate,
  authorize(['Hospital Admin', 'Clinician']),
  validate(referralIdParamSchema, 'params'),
  validate(updateReferralSchema),
  auditLog({ actionType: 'UPDATE_REFERRAL', resourceType: 'referral' }),
  controller.update,
);

// DELETE /api/v1/referrals/:referralId
router.delete(
  '/:referralId',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician']),
  validate(referralIdParamSchema, 'params'),
  auditLog({ actionType: 'DELETE_REFERRAL', resourceType: 'referral' }),
  controller.delete,
);

// PATCH /api/v1/referrals/:referralId/status  — Module 5
// Architecture Contract §8.7 / OpenAPI v1.0 — path, method, and request body
// field (`status`, not `newStatus`) all aligned to the formal API contract.
// Fine-grained per-transition authorization (who may move a referral from
// which status to which) is enforced by validateTransition() against
// ROLE_TRANSITIONS in referrals.state-machine.ts — the coarse role gate
// below only confirms the caller is a role that can ever transition referrals.
router.patch(
  '/:referralId/status',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(referralIdParamSchema, 'params'),
  validate(transitionStatusSchema),
  auditLog({ actionType: 'TRANSITION_REFERRAL', resourceType: 'referral' }),
  controller.transition,
);

// GET /api/v1/referrals/:referralId/timeline  — Module 6
router.get(
  '/:referralId/timeline',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(referralIdParamSchema, 'params'),
  controller.timeline,
);

// GET /api/v1/referrals/:referralId/attachments
router.get(
  '/:referralId/attachments',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist']),
  validate(referralIdParamSchema, 'params'),
  controller.getAttachments,
);

// DELETE /api/v1/referrals/:referralId/attachments/:attachmentId
router.delete(
  '/:referralId/attachments/:attachmentId',
  authenticate,
  authorize(['System Admin', 'Hospital Admin', 'Clinician']),
  validate(referralIdParamSchema, 'params'),
  auditLog({ actionType: 'REMOVE_ATTACHMENT', resourceType: 'referral' }),
  controller.removeAttachment,
);

export default router;
