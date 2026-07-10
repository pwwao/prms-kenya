/**
 * PRMS Mobile — Root App Component
 * Wires Redux, React Query, WatermelonDB, Navigation, and Push Notifications.
 */
import React, { useEffect } from 'react';
import { StatusBar, Platform, LogBox } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { store, persistor } from '@store/index';
import { queryClient } from '@api/queryClient';
import { DatabaseProvider } from '@db/DatabaseProvider';
import RootNavigator from '@navigation/RootNavigator';
import { Colors } from '@theme/tokens';
import { initializePushNotifications, setBackgroundMessageHandler } from '@api/pushNotifications';
import { chatSocket } from '@api/socket';
import { LoadingView } from '@components/common/States';

// Background FCM handler must register at module scope, before render
setBackgroundMessageHandler();

LogBox.ignoreLogs(['Non-serializable values were found']);

export default function App() {
  useEffect(() => {
    initializePushNotifications();
    chatSocket.connect();

    return () => {
      chatSocket.disconnect();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate loading={<LoadingView />} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <DatabaseProvider>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor={Colors.white}
                  translucent={Platform.OS === 'android'}
                />
                <RootNavigator />
                <Toast />
              </DatabaseProvider>
            </QueryClientProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
