/**
 * WatermelonDB Models
 */
import { Model, field } from '@nozbe/watermelondb';

// ─── Patient Model ────────────────────────────────────────────────────────────

export class PatientModel extends Model {
  static table = 'patients';

  @field('server_id') serverId!: number | null;
  @field('full_name') fullName!: string;
  @field('national_id') nationalId!: string | null;
  @field('id_type') idType!: string | null;
  @field('gender') gender!: string;
  @field('date_of_birth') dateOfBirth!: string;
  @field('age') age!: number;
  @field('county') county!: string;
  @field('phone_number') phoneNumber!: string;
  @field('created_at_server') createdAtServer!: string;
  @field('updated_at_local') updatedAtLocal!: number;
  @field('sync_status') syncStatus!: 'synced' | 'pending' | 'error';
}

// ─── Referral Model ───────────────────────────────────────────────────────────

export class ReferralModel extends Model {
  static table = 'referrals';

  @field('server_id') serverId!: number | null;
  @field('referral_code') referralCode!: string;
  @field('status') status!: string;
  @field('urgency_level') urgencyLevel!: string;
  @field('direction') direction!: string;
  @field('reason_for_referral') reasonForReferral!: string;
  @field('clinical_summary') clinicalSummary!: string;
  @field('rejection_reason') rejectionReason!: string;
  @field('patient_id_server') patientIdServer!: number;
  @field('patient_display_name') patientDisplayName!: string;
  @field('patient_gender') patientGender!: string;
  @field('patient_age') patientAge!: number;
  @field('source_hospital_id') sourceHospitalId!: number;
  @field('source_hospital_name') sourceHospitalName!: string;
  @field('source_hospital_level') sourceHospitalLevel!: string;
  @field('dest_hospital_id') destHospitalId!: number;
  @field('dest_hospital_name') destHospitalName!: string;
  @field('dest_hospital_level') destHospitalLevel!: string;
  @field('created_by_name') createdByName!: string;
  @field('timeline_json') timelineJson!: string;
  @field('created_at_server') createdAtServer!: string;
  @field('updated_at_server') updatedAtServer!: string;
  @field('updated_at_local') updatedAtLocal!: number;
  @field('sync_status') syncStatus!: 'synced' | 'pending' | 'error';

  get timeline() {
    try {
      return JSON.parse(this.timelineJson ?? '[]');
    } catch {
      return [];
    }
  }
}

// ─── Notification Model ───────────────────────────────────────────────────────

export class NotificationModel extends Model {
  static table = 'notifications';

  @field('server_id') serverId!: number;
  @field('type') type!: string;
  @field('title') title!: string;
  @field('body') body!: string;
  @field('is_read') isRead!: boolean;
  @field('data_json') dataJson!: string;
  @field('created_at_server') createdAtServer!: string;
  @field('updated_at_local') updatedAtLocal!: number;

  get data() {
    try {
      return JSON.parse(this.dataJson ?? '{}');
    } catch {
      return {};
    }
  }
}

// ─── Sync Queue Model ─────────────────────────────────────────────────────────

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  @field('entity_type') entityType!: string;
  @field('operation') operation!: string;
  @field('local_record_id') localRecordId!: string;
  @field('payload_json') payloadJson!: string;
  @field('created_at_local') createdAtLocal!: number;
  @field('retry_count') retryCount!: number;
  @field('error_message') errorMessage!: string;

  get payload() {
    try {
      return JSON.parse(this.payloadJson);
    } catch {
      return {};
    }
  }
}
