/**
 * PRMS Utility Helpers
 */
import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow, parseISO, differenceInYears } from 'date-fns';
import type { ReferralStatus, UrgencyLevel } from '@types/index';
import { Colors } from '@theme/tokens';

// ─── Request ID ───────────────────────────────────────────────────────────────

export function generateRequestId(): string {
  return uuidv4();
}

export function generateLocalId(): string {
  return `local_${uuidv4()}`;
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy \'at\' h:mm a');
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function calculateAge(dateOfBirth: string): number {
  try {
    return differenceInYears(new Date(), parseISO(dateOfBirth));
  } catch {
    return 0;
  }
}

// ─── Status Styling ───────────────────────────────────────────────────────────

export function getStatusColor(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    Draft: Colors.statusDraft,
    Dispatched: Colors.statusDispatched,
    Received: Colors.statusReceived,
    Accepted: Colors.statusAccepted,
    Rejected: Colors.statusRejected,
    Completed: Colors.statusCompleted,
  };
  return map[status] ?? Colors.gray500;
}

export function getStatusBgColor(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    Draft: Colors.statusDraftBg,
    Dispatched: Colors.statusDispatchedBg,
    Received: Colors.statusReceivedBg,
    Accepted: Colors.statusAcceptedBg,
    Rejected: Colors.statusRejectedBg,
    Completed: Colors.statusCompletedBg,
  };
  return map[status] ?? Colors.gray100;
}

export function getUrgencyColor(urgency: UrgencyLevel): string {
  const map: Record<UrgencyLevel, string> = {
    Routine: Colors.urgencyRoutine,
    Urgent: Colors.urgencyUrgent,
    Emergent: Colors.urgencyEmergent,
  };
  return map[urgency] ?? Colors.gray500;
}

export function getUrgencyIcon(urgency: UrgencyLevel): string {
  const map: Record<UrgencyLevel, string> = {
    Routine: '⚪',
    Urgent: '🟠',
    Emergent: '🔴',
  };
  return map[urgency] ?? '⚪';
}

// ─── Patient Data Masking helpers ─────────────────────────────────────────────
// API handles masking — these are for local display edge cases only

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  const initials = parts.slice(1).map((p) => `${p[0]}.`).join(' ');
  return `${parts[0]} ${initials}`;
}

export function maskNationalId(id: string): string {
  if (id.length <= 4) return 'X'.repeat(id.length);
  return 'XXXX' + id.slice(-4);
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  // +254712345678 → 071XXXX678 (as per spec)
  const digits = phone.replace(/^\+254/, '07').replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `${digits.slice(0, 3)}XXXX${digits.slice(-3)}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidKenyanPhone(phone: string): boolean {
  return /^\+2547\d{8}$/.test(phone);
}

export function isValidNationalId(id: string): boolean {
  return /^\d{7,8}$/.test(id);
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

// ─── Action permissions per role × status ────────────────────────────────────
// Per PRMS_UserRoles_UserFlows_UITeam.md Appendix C

export function canDispatch(
  status: ReferralStatus,
  role: string,
): boolean {
  return status === 'Draft' && (role === 'Clinician' || role === 'Receptionist');
}

export function canMarkReceived(
  status: ReferralStatus,
  role: string,
): boolean {
  return status === 'Dispatched' && role === 'Receptionist';
}

export function canAcceptOrReject(
  status: ReferralStatus,
  role: string,
): boolean {
  return status === 'Received' && role === 'Clinician';
}

export function canMarkComplete(
  status: ReferralStatus,
  role: string,
): boolean {
  return status === 'Accepted' && role === 'Clinician';
}

export function canRedispatch(
  status: ReferralStatus,
  role: string,
): boolean {
  return status === 'Rejected' && role === 'Clinician';
}

export function canChat(role: string): boolean {
  return role === 'Clinician';
}

// ─── Truncation ───────────────────────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

// ─── Error extraction ─────────────────────────────────────────────────────────

export function extractApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: { error?: { message?: string }; message?: string };
      };
    };
    return (
      axiosError.response?.data?.error?.message ??
      axiosError.response?.data?.message ??
      'Something went wrong. Please try again.'
    );
  }
  if (error instanceof Error) {
    if (error.name === 'NetworkError') {
      return 'No internet connection. Please check your network.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
