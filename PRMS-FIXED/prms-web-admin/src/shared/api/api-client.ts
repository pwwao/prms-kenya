/**
 * Centralized Axios instance — the ONLY place HTTP calls originate from.
 * Attaches Authorization header, X-Request-ID, handles 401 refresh-once,
 * and unwraps the standard API envelope.
 *
 * See PRMS_API_Reference_v1.0.md — "Standard Response Envelope" and
 * Architecture Contract §11.3 ("API Integration Layer").
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api.types';
import { store } from '@/app/store';
import { tokenRefreshed, loggedOut } from '@/features/auth/store/auth.slice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

function generateRequestId(): string {
  return (
    crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

// ── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = store.getState().auth;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Request-ID'] = generateRequestId();
  return config;
});

// ── RESPONSE INTERCEPTOR — 401 REFRESH-ONCE ──────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthError =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh');

    if (!isAuthError) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests while a refresh is already in flight
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(originalRequest)));
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = store.getState().auth;
      if (!refreshToken) throw new Error('No refresh token available');

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const newAccessToken = data.data.accessToken as string;

      store.dispatch(tokenRefreshed(newAccessToken));
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];

      return apiClient(originalRequest);
    } catch (refreshError) {
      store.dispatch(loggedOut());
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/** Extracts a user-friendly error message from any caught API error. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.error?.message ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function getApiErrorDetails(error: unknown) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.error?.details ?? [];
  }
  return [];
}
