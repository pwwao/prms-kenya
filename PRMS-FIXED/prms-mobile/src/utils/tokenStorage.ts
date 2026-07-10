/**
 * Secure token storage using react-native-keychain.
 * Falls back to MMKV for non-sensitive data (user profile, last sync).
 */
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { STORAGE_KEYS } from '@constants/index';
import type { AuthUser } from '@types/index';

const storage = new MMKV({ id: 'prms-storage' });

export const tokenStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Keychain.setGenericPassword(
      STORAGE_KEYS.ACCESS_TOKEN,
      JSON.stringify({ accessToken, refreshToken }),
      { service: 'com.prms.kenya.tokens' },
    );
  },

  async setAccessToken(accessToken: string): Promise<void> {
    const existing = await this.getRefreshToken();
    if (existing) {
      await this.setTokens(accessToken, existing);
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      const creds = await Keychain.getGenericPassword({ service: 'com.prms.kenya.tokens' });
      if (!creds) return null;
      const { accessToken } = JSON.parse(creds.password) as {
        accessToken: string;
        refreshToken: string;
      };
      return accessToken;
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const creds = await Keychain.getGenericPassword({ service: 'com.prms.kenya.tokens' });
      if (!creds) return null;
      const { refreshToken } = JSON.parse(creds.password) as {
        accessToken: string;
        refreshToken: string;
      };
      return refreshToken;
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: 'com.prms.kenya.tokens' });
    } catch {
      // ignore
    }
  },
};

export const userStorage = {
  setUser(user: AuthUser): void {
    storage.set(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getUser(): AuthUser | null {
    const raw = storage.getString(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  clearUser(): void {
    storage.delete(STORAGE_KEYS.USER);
  },
};

export const syncStorage = {
  setLastSyncedAt(iso: string): void {
    storage.set(STORAGE_KEYS.LAST_SYNCED_AT, iso);
  },

  getLastSyncedAt(): string | null {
    return storage.getString(STORAGE_KEYS.LAST_SYNCED_AT) ?? null;
  },

  clearLastSyncedAt(): void {
    storage.delete(STORAGE_KEYS.LAST_SYNCED_AT);
  },
};

export const deviceStorage = {
  getDeviceId(): string | null {
    return storage.getString(STORAGE_KEYS.DEVICE_ID) ?? null;
  },

  setDeviceId(id: string): void {
    storage.set(STORAGE_KEYS.DEVICE_ID, id);
  },
};
