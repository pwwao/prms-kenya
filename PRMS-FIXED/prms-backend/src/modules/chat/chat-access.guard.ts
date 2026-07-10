/**
 * Chat Access Guard
 *
 * Architecture Contract §4.1 — `referrals` is owned by the Referral Service;
 * Chat Service does not own this table. This repository performs a
 * **read-only** lookup of the minimal fields needed to enforce
 * Architecture Contract §10.3 facility isolation for chat access
 * (`chat:access` permission — a user may only read/send messages on a
 * referral that involves their own hospital).
 *
 * No writes to `referrals` happen here, and no other referral fields are
 * selected. If the Referral module later exposes an in-process service
 * method for this check, this file should be replaced with a call to it.
 */

import type mysql from 'mysql2/promise';
import { BaseRepository } from '../../shared/base.repository.js';
import { NotFoundError } from '../../shared/errors/domain.errors.js';

export interface IReferralAccessRow extends mysql.RowDataPacket {
  id: number;
  source_hospital_id: number;
  destination_hospital_id: number;
  current_status:
    | 'Draft'
    | 'Dispatched'
    | 'Received'
    | 'Accepted'
    | 'Rejected'
    | 'Completed';
}

export class ChatAccessGuard extends BaseRepository {
  protected readonly moduleName = 'chat';

  /**
   * Returns the minimal referral fields needed for a facility-isolation
   * check. Throws NotFoundError if the referral does not exist.
   */
  async getReferralAccessInfo(referralId: number): Promise<IReferralAccessRow> {
    return this.queryOneOrFail<IReferralAccessRow>(
      `SELECT id, source_hospital_id, destination_hospital_id, current_status
         FROM referrals WHERE id = ?`,
      [referralId],
      'Referral',
    );
  }

  /**
   * Verifies that the given hospital is a party to the referral
   * (source or destination). System Admins (hospitalId === null) are
   * always allowed — checked by the caller before invoking this.
   */
  async assertHospitalIsParty(referralId: number, hospitalId: number): Promise<void> {
    const referral = await this.getReferralAccessInfo(referralId);
    const isParty =
      referral.source_hospital_id === hospitalId ||
      referral.destination_hospital_id === hospitalId;

    if (!isParty) {
      // Treat as not found to avoid leaking referral existence across facilities
      throw new NotFoundError('Referral');
    }
  }
}
