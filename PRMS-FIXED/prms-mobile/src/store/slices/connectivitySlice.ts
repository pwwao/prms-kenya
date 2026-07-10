/**
 * Connectivity + Sync Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { performSync, type SyncResult } from '@db/sync';

interface ConnectivityState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  pendingMutations: number;
}

const initialState: ConnectivityState = {
  isOnline: true,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  pendingMutations: 0,
};

export const syncThunk = createAsyncThunk<SyncResult>(
  'connectivity/sync',
  async () => {
    return performSync();
  },
);

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setPendingMutations: (state, action: PayloadAction<number>) => {
      state.pendingMutations = action.payload;
    },
    clearSyncError: (state) => {
      state.syncError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncThunk.pending, (state) => {
        state.isSyncing = true;
        state.syncError = null;
      })
      .addCase(syncThunk.fulfilled, (state, action) => {
        state.isSyncing = false;
        if (action.payload.success) {
          state.lastSyncedAt = new Date().toISOString();
          state.syncError = null;
        } else {
          state.syncError = action.payload.error ?? 'Sync failed';
        }
      })
      .addCase(syncThunk.rejected, (state) => {
        state.isSyncing = false;
        state.syncError = 'Sync failed. Will retry when online.';
      });
  },
});

export const { setOnline, setPendingMutations, clearSyncError } = connectivitySlice.actions;
export default connectivitySlice.reducer;
