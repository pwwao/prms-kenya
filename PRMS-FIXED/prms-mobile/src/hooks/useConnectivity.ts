/**
 * useConnectivity — NetInfo-driven online/offline detection with auto-sync
 */
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@store/index';
import { setOnline } from '@store/slices/connectivitySlice';
import { syncThunk } from '@store/slices/connectivitySlice';
import { chatSocket } from '@api/socket';
import { APP_CONFIG } from '@constants/index';

export function useConnectivity() {
  const dispatch = useDispatch<AppDispatch>();
  const { isOnline, isSyncing, lastSyncedAt, syncError } = useSelector(
    (s: RootState) => s.connectivity,
  );
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      dispatch(setOnline(online));

      // Reconnect socket and sync when coming back online
      if (online && wasOffline.current) {
        chatSocket.connect();
        dispatch(syncThunk());
      }
      wasOffline.current = !online;
    });

    return () => unsubscribe();
  }, [dispatch]);

  // Periodic background sync while online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      dispatch(syncThunk());
    }, APP_CONFIG.SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, dispatch]);

  return { isOnline, isSyncing, lastSyncedAt, syncError };
}
