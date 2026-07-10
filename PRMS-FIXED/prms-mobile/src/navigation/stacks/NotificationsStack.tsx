/**
 * Notifications Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NotificationsStackParamList } from '../types';
import NotificationsScreen from '@screens/notifications/NotificationsScreen';
import { Colors, Typography } from '@theme/tokens';

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export default function NotificationsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontSize: Typography.fontSize.lg,
          fontWeight: Typography.fontWeight.semiBold,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
}
