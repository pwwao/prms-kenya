/**
 * Auth Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '@api/services';
import { tokenStorage, userStorage } from '@utils/tokenStorage';
import type { AuthUser, LoginRequest, Verify2FARequest } from '@types/index';

interface AuthState {
  user: AuthUser | null;
  preAuthToken: string | null;
  deliveryMethod: 'TOTP' | 'SMS' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpired: boolean;
}

const initialState: AuthState = {
  user: userStorage.getUser(),
  preAuthToken: null,
  deliveryMethod: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpired: false,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      return response.data.data;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Login failed';
      return rejectWithValue(msg);
    }
  },
);

export const verify2FAThunk = createAsyncThunk(
  'auth/verify2FA',
  async (data: Verify2FARequest, { rejectWithValue }) => {
    try {
      const response = await authApi.verify2FA(data);
      const { accessToken, refreshToken, user } = response.data.data;
      await tokenStorage.setTokens(accessToken, refreshToken);
      userStorage.setUser(user);
      return user;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '2FA verification failed';
      return rejectWithValue(msg);
    }
  },
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
  } catch {
    // ignore API errors on logout
  } finally {
    await tokenStorage.clearTokens();
    userStorage.clearUser();
  }
});

export const fetchMeThunk = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getMe();
      const user = response.data.data;
      userStorage.setUser(user);
      return user;
    } catch (error: unknown) {
      return rejectWithValue('Failed to load profile');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.sessionExpired = true;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearSessionExpired: (state) => {
      state.sessionExpired = false;
    },
    setAuthenticated: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.sessionExpired = false;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload;

        if (data.status === '2FA_REQUIRED') {
          state.preAuthToken = data.preAuthToken ?? null;
          state.deliveryMethod = data.deliveryMethod ?? null;
        } else if (data.accessToken && data.user) {
          // Direct login (no 2FA)
          state.user = data.user;
          state.isAuthenticated = true;
          tokenStorage.setTokens(data.accessToken, data.refreshToken ?? '');
          userStorage.setUser(data.user);
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify 2FA
    builder
      .addCase(verify2FAThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verify2FAThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.preAuthToken = null;
        state.deliveryMethod = null;
      })
      .addCase(verify2FAThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.preAuthToken = null;
        state.sessionExpired = false;
      });

    // Fetch Me
    builder
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      });
  },
});

export const { sessionExpired, clearAuthError, clearSessionExpired, setAuthenticated } =
  authSlice.actions;

export default authSlice.reducer;
