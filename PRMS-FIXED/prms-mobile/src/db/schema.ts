/**
 * WatermelonDB Schema
 * Offline-first local database schema for PRMS mobile.
 * Mirrors the server entities needed for offline operation.
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // ── Patients ────────────────────────────────────────────────────────────
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'full_name', type: 'string' },
        { name: 'national_id', type: 'string', isOptional: true },
        { name: 'id_type', type: 'string', isOptional: true },
        { name: 'gender', type: 'string' },
        { name: 'date_of_birth', type: 'string', isOptional: true },
        { name: 'age', type: 'number', isOptional: true },
        { name: 'county', type: 'string' },
        { name: 'phone_number', type: 'string', isOptional: true },
        { name: 'created_at_server', type: 'string', isOptional: true },
        { name: 'updated_at_local', type: 'number' },
        { name: 'sync_status', type: 'string' }, // 'synced' | 'pending' | 'error'
      ],
    }),

    // ── Referrals ───────────────────────────────────────────────────────────
    tableSchema({
      name: 'referrals',
      columns: [
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'referral_code', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'urgency_level', type: 'string' },
        { name: 'direction', type: 'string', isOptional: true },
        { name: 'reason_for_referral', type: 'string', isOptional: true },
        { name: 'clinical_summary', type: 'string', isOptional: true },
        { name: 'rejection_reason', type: 'string', isOptional: true },
        { name: 'patient_id_server', type: 'number', isOptional: true },
        { name: 'patient_display_name', type: 'string', isOptional: true },
        { name: 'patient_gender', type: 'string', isOptional: true },
        { name: 'patient_age', type: 'number', isOptional: true },
        { name: 'source_hospital_id', type: 'number', isOptional: true },
        { name: 'source_hospital_name', type: 'string', isOptional: true },
        { name: 'source_hospital_level', type: 'string', isOptional: true },
        { name: 'dest_hospital_id', type: 'number', isOptional: true },
        { name: 'dest_hospital_name', type: 'string', isOptional: true },
        { name: 'dest_hospital_level', type: 'string', isOptional: true },
        { name: 'created_by_name', type: 'string', isOptional: true },
        { name: 'timeline_json', type: 'string', isOptional: true },
        { name: 'created_at_server', type: 'string', isOptional: true },
        { name: 'updated_at_server', type: 'string', isOptional: true },
        { name: 'updated_at_local', type: 'number' },
        { name: 'sync_status', type: 'string' }, // 'synced' | 'pending' | 'error'
      ],
    }),

    // ── Notifications ────────────────────────────────────────────────────────
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'server_id', type: 'number' },
        { name: 'type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'is_read', type: 'boolean' },
        { name: 'data_json', type: 'string', isOptional: true },
        { name: 'created_at_server', type: 'string' },
        { name: 'updated_at_local', type: 'number' },
      ],
    }),

    // ── Pending Sync Queue ───────────────────────────────────────────────────
    // Stores mutations made offline that need to be replayed when online
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string' },  // 'patient' | 'referral'
        { name: 'operation', type: 'string' },     // 'create' | 'update'
        { name: 'local_record_id', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'created_at_local', type: 'number' },
        { name: 'retry_count', type: 'number' },
        { name: 'error_message', type: 'string', isOptional: true },
      ],
    }),
  ],
});
