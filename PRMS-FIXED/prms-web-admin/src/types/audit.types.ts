import type { UserRole } from './auth.types';

export interface AuditLog {
  id: number;
  user: {
    id: number;
    username: string;
    role: UserRole;
  } | null;
  actionType: string;
  ipAddress: string;
  userAgent: string;
  resourceAffected: string;
  payloadSnapshot: string | null;
  timestamp: string;
}

export interface AuditLogParams {
  userId?: number;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  ip?: string;
  page?: number;
  limit?: number;
}
