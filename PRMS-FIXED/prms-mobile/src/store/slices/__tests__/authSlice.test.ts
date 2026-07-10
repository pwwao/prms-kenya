/**
 * Auth Slice — Unit Tests
 */
import authReducer, {
  sessionExpired,
  clearAuthError,
  clearSessionExpired,
  setAuthenticated,
} from '../authSlice';
import type { AuthUser } from '@types/index';

const mockUser: AuthUser = {
  id: 1,
  username: 'jdoe',
  fullName: 'Jane Doe',
  role: 'Clinician',
  hospitalId: 5,
  hospitalName: 'Kenyatta National Hospital',
  isFirstLogin: false,
};

const initialState = {
  user: null,
  preAuthToken: null,
  deliveryMethod: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpired: false,
};

describe('authSlice reducer', () => {
  it('returns initial state for unknown action', () => {
    expect(authReducer(initialState, { type: 'unknown' })).toEqual(initialState);
  });

  it('setAuthenticated sets user and isAuthenticated', () => {
    const state = authReducer(initialState, setAuthenticated(mockUser));
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.sessionExpired).toBe(false);
  });

  it('sessionExpired clears user and sets flag', () => {
    const loggedInState = { ...initialState, user: mockUser, isAuthenticated: true };
    const state = authReducer(loggedInState, sessionExpired());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.sessionExpired).toBe(true);
  });

  it('clearSessionExpired resets the flag', () => {
    const expiredState = { ...initialState, sessionExpired: true };
    const state = authReducer(expiredState, clearSessionExpired());
    expect(state.sessionExpired).toBe(false);
  });

  it('clearAuthError clears the error message', () => {
    const errorState = { ...initialState, error: 'Invalid credentials' };
    const state = authReducer(errorState, clearAuthError());
    expect(state.error).toBeNull();
  });
});
