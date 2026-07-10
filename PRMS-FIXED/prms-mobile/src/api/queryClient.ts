/**
 * React Query — Query Client Configuration + Key Factories
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 minutes
      gcTime: 30 * 60 * 1000,      // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors or network errors offline
        if (error && typeof error === 'object' && 'response' in error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
        }
        if (error instanceof Error && error.name === 'NetworkError') return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: false,
    },
  },
});

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const queryKeys = {
  // Auth
  me: () => ['auth', 'me'] as const,

  // Patients
  patients: {
    all: () => ['patients'] as const,
    search: (q: string) => ['patients', 'search', q] as const,
    detail: (id: number) => ['patients', id] as const,
  },

  // Hospitals
  hospitals: {
    all: (params?: Record<string, unknown>) => ['hospitals', params] as const,
    search: (q: string) => ['hospitals', 'search', q] as const,
  },

  // Referrals
  referrals: {
    all: (params?: Record<string, unknown>) => ['referrals', params] as const,
    incoming: () => ['referrals', 'incoming'] as const,
    outgoing: () => ['referrals', 'outgoing'] as const,
    detail: (id: number) => ['referrals', id] as const,
    messages: (referralId: number) => ['referrals', referralId, 'messages'] as const,
  },

  // Notifications
  notifications: {
    all: (params?: Record<string, unknown>) => ['notifications', params] as const,
    unread: () => ['notifications', 'unread'] as const,
  },
} as const;
