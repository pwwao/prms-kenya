/**
 * Audit Logs API — maps to PRMS_API_Reference_v1.0.md "MODULE 9 — AUDIT LOGS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccessPaginated } from '@/types/api.types';
import type { AuditLog, AuditLogParams } from '@/types/audit.types';

export const auditApi = {
  list: async (params: AuditLogParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<AuditLog>>('/audit-logs', { params });
    return data;
  },
};
