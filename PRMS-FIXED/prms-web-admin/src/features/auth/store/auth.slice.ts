import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserSummary } from '@/types/auth.types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSummary | null;
  preAuthToken: string | null;
}

const STORAGE_KEY = 'prms_auth';

function loadPersisted(): Pick<AuthState, 'accessToken' | 'refreshToken' | 'user'> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function persist(state: AuthState) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user,
    })
  );
}

const initialState: AuthState = {
  ...loadPersisted(),
  preAuthToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    preAuthSet(state, action: PayloadAction<string>) {
      state.preAuthToken = action.payload;
    },
    loggedIn(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: UserSummary }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.preAuthToken = null;
      persist(state);
    },
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      persist(state);
    },
    profileUpdated(state, action: PayloadAction<Partial<UserSummary>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        persist(state);
      }
    },
    loggedOut(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.preAuthToken = null;
      sessionStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { preAuthSet, loggedIn, tokenRefreshed, profileUpdated, loggedOut } = authSlice.actions;
export default authSlice.reducer;
