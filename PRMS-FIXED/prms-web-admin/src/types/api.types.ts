/**
 * Core API envelope types — mirrors the PRMS API Standard Envelope
 * (see PRMS_API_Reference_v1.0.md, "Standard Response Envelope")
 */

export interface ApiMeta {
  timestamp: string;
  requestId: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiMetaPaginated extends ApiMeta {
  pagination: Pagination;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  meta: ApiMeta;
}

export interface ApiSuccessPaginated<T> {
  success: true;
  data: T[];
  message: string;
  meta: ApiMetaPaginated;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiMeta;
}

/** Approved error codes — see Architecture Contract §8.3 */
export type ApiErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_REFRESH_TOKEN_EXPIRED'
  | 'AUTH_2FA_REQUIRED'
  | 'AUTH_2FA_INVALID_OTP'
  | 'AUTH_ACCOUNT_SUSPENDED'
  | 'AUTH_ACCOUNT_INACTIVE'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'AUTH_HOSPITAL_SUSPENDED'
  | 'VALIDATION_ERROR'
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_SUSPENDED'
  | 'RESOURCE_INVALID_STATE_TRANSITION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_CONNECTION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
}
