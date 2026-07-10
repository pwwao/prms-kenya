/**
 * Sync Routes — POST /api/v1/sync
 * Architecture Contract §13.3 — Mobile offline-first synchronisation.
 *
 * Returns all data changed since `lastSyncedAt` that the authenticated user
 * is permitted to see, in a single response for WatermelonDB to apply.
 *
 * Response shape matches mobile's SyncResponse interface (src/db/sync.ts):
 *   { referrals, patients, notifications, serverTime }
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../shared/response.helper.js';
import { ReferralRepository } from '../referrals/referrals.repository.js';
import { PatientRepository } from '../patients/patients.repository.js';
import { NotificationsRepository } from '../notifications/notifications.repository.js';
import { ForbiddenError } from '../../shared/errors/domain.errors.js';

// ─── Validation ───────────────────────────────────────────────────────────────

const syncRequestSchema = z.object({
  lastSyncedAt: z.string().datetime({ message: 'lastSyncedAt must be an ISO 8601 datetime' }),
  deviceId:     z.string().min(1).max(100),
});

// ─── Dependencies ─────────────────────────────────────────────────────────────

const referralsRepo     = new ReferralRepository();
const patientsRepo      = new PatientRepository();
const notificationsRepo = new NotificationsRepository();

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// POST /api/v1/sync
router.post(
  '/',
  authenticate,
  validate(syncRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;

      // System Admins don't use the mobile app — they use the web admin portal.
      // The sync endpoint is for hospital staff (Clinician, Receptionist, Hospital Admin).
      if (user.hospitalId === null) {
        throw new ForbiddenError('Sync is not available for System Admin accounts');
      }

      const body = req.body as { lastSyncedAt: string; deviceId: string };
      const since = new Date(body.lastSyncedAt);
      const serverTime = new Date().toISOString();

      // Fetch all changed data in parallel
      const [referralRows, patientRows, notificationRows] = await Promise.all([
        referralsRepo.findForSync(user.hospitalId, since),
        patientsRepo.findForSync(user.hospitalId, since),
        notificationsRepo.findUnreadForSync(user.userId, since),
      ]);

      // Map rows to the shapes mobile's WatermelonDB sync.ts expects.
      // Fields are deliberately minimal — only what mobile's models declare.
      const referrals = referralRows.map((r) => ({
        id:                     r.id,
        referralCode:           r.referral_code,
        patientId:              r.patient_id,
        sourceHospitalId:       r.source_hospital_id,
        destinationHospitalId:  r.destination_hospital_id,
        currentStatus:          r.current_status,
        urgencyLevel:           r.urgency_level,
        clinicalSummary:        r.clinical_summary_encrypted ? '[encrypted]' : null,
        updatedAt:              r.updated_at,
      }));

      const patients = patientRows.map((p) => ({
        id:         p.id,
        fullName:   '[encrypted]', // PII — never sent in plaintext over sync
        dob:        p.date_of_birth,
        gender:     p.gender,
        updatedAt:  p.updated_at,
      }));

      const notifications = notificationRows.map((n) => ({
        id:        n.id,
        type:      n.type,
        title:     n.title,
        body:      n.body,
        payload:   n.payload_json ? JSON.parse(n.payload_json as string) : null,
        isRead:    n.is_read === 1,
        createdAt: n.created_at,
      }));

      sendSuccess(res, { referrals, patients, notifications, serverTime }, 'Sync successful');
    } catch (err) { next(err); }
  },
);

export { router as syncRouter };
