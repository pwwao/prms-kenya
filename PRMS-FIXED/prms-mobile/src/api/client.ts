/**
 * PRMS API Client
 * - Axios instance with JWT Bearer auth
 * - Automatic token refresh on 401 (queued retry)
 * - Request ID injection per API contract
 * - Network error detection for offline mode
 */
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { APP_CONFIG } from '@constants/index';
import { tokenStorage } from '@utils/tokenStorage';
import { generateRequestId } from '@utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueuedRequest {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

// ─── Create Instance ──────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Token Refresh State ──────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

// ─── Request Interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Inject X-Request-ID per API contract
    config.headers['X-Request-ID'] = generateRequestId();

    // Inject Authorization header
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — auto-refresh on 401 ───────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle network errors (offline)
    if (!error.response) {
      const networkError = new Error('NETWORK_ERROR');
      networkError.name = 'NetworkError';
      return Promise.reject(networkError);
    }

    // Handle 401 — attempt token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post<{
          success: boolean;
          data: { accessToken: string; expiresIn: number };
        }>(`${APP_CONFIG.API_BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken } = response.data.data;
        await tokenStorage.setAccessToken(accessToken);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        await tokenStorage.clearTokens();
        // Signal to Redux store that session expired
        import('@store/index').then(({ store }) => {
          import('@store/slices/authSlice').then(({ sessionExpired }) => {
            store.dispatch(sessionExpired());
          });
        });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
