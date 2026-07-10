/**
 * Redux Store Configuration
 */
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { MMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';
import authReducer from './slices/authSlice';
import connectivityReducer from './slices/connectivitySlice';

// ─── MMKV-backed persist storage ─────────────────────────────────────────────

const mmkv = new MMKV({ id: 'prms-redux' });

const mmkvStorage: Storage = {
  setItem: (key: string, value: string) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key: string) => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key: string) => {
    mmkv.delete(key);
    return Promise.resolve();
  },
};

// ─── Persist Config ───────────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'auth',
  storage: mmkvStorage,
  whitelist: ['user', 'isAuthenticated'],
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    connectivity: connectivityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
