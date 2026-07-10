import { format, formatDistanceToNow, parseISO } from 'date-fns';

/** Format an ISO date string to a human-readable date. */
export function formatDate(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy'); }
  catch { return '—'; }
}

/** Format an ISO date string to date + time. */
export function formatDateTime(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy, HH:mm'); }
  catch { return '—'; }
}

/** Returns a relative time string e.g. "3 hours ago". */
export function timeAgo(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return '—'; }
}

/** Mask a Kenya national ID — e.g. "23456789" → "XXXX6789" */
export function maskNationalId(id: string): string {
  if (id.length <= 4) return id;
  return 'X'.repeat(id.length - 4) + id.slice(-4);
}

/** Mask a phone number — e.g. "+254712345678" → "+25471XXXX678" */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  const keep = 4;
  return phone.slice(0, phone.length - keep - 4) + 'XXXX' + phone.slice(-keep);
}

/** Abbreviate a full name — "Jane Wambui Mwangi" → "Jane W. M." */
export function maskFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [first, ...rest] = parts;
  return `${first} ${rest.map((p) => p[0] + '.').join(' ')}`;
}

/** Format bytes to KB/MB/GB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
