/**
 * Patients Router
 * Clinicians and Receptionists can register and view patients (own hospital only).
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize, requirePermission } from '../../middleware/authorize.middleware.js';
import { validate, validateMany } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { PatientController } from './patients.controller.js';
import { PatientService } from './patients.service.js';
import { PatientRepository } from './patients.repository.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  createPatientSchema,
  updatePatientSchema,
  listPatientsQuerySchema,
  searchQuerySchema,
  patientIdParamSchema,
} from './patients.validator.js';

const repo       = new PatientRepository();
const cache      = new CacheService();
const service    = new PatientService(repo, cache);
const controller = new PatientController(service);

const router = Router();

// POST /api/v1/patients
router.post(
  '/',
  authenticate,
  authorize(['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']),
  requirePermission('patient:register'),
  validate(createPatientSchema),
  auditLog({ actionType: 'REGISTER_PATIENT', resourceType: 'patient' }),
  controller.create,
);

// GET /api/v1/patients/search  ← must come before /:patientId
router.get(
  '/search',
  authenticate,
  authorize(['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']),
  validate(searchQuerySchema, 'query'),
  auditLog({ actionType: 'SEARCH_PATIENT', resourceType: 'patient' }),
  controller.search,
);

// GET /api/v1/patients
router.get(
  '/',
  authenticate,
  authorize(['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']),
  validate(listPatientsQuerySchema, 'query'),
  controller.list,
);

// GET /api/v1/patients/:patientId
router.get(
  '/:patientId',
  authenticate,
  authorize(['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']),
  validate(patientIdParamSchema, 'params'),
  auditLog({ actionType: 'VIEW_PATIENT', resourceType: 'patient' }),
  controller.getById,
);

// PATCH /api/v1/patients/:patientId
router.patch(
  '/:patientId',
  authenticate,
  authorize(['Clinician', 'Hospital Admin', 'System Admin']),
  validate(patientIdParamSchema, 'params'),
  validate(updatePatientSchema),
  auditLog({ actionType: 'UPDATE_PATIENT', resourceType: 'patient' }),
  controller.update,
);

// GET /api/v1/patients/:patientId/referral-history
router.get(
  '/:patientId/referral-history',
  authenticate,
  authorize(['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin']),
  validate(patientIdParamSchema, 'params'),
  controller.referralHistory,
);

export default router;
