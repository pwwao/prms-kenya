/**
 * Referral Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReferralStackParamList } from '../types';
import ReferralListScreen from '@screens/referrals/ReferralListScreen';
import ReferralDetailScreen from '@screens/referrals/ReferralDetailScreen';
import ReferralTimelineScreen from '@screens/referrals/ReferralTimelineScreen';
import ChatScreen from '@screens/chat/ChatScreen';
import { Colors, Typography } from '@theme/tokens';

const Stack = createNativeStackNavigator<ReferralStackParamList>();

export default function ReferralStack() {
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
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="ReferralList"
        component={ReferralListScreen}
        options={{ title: 'Referrals' }}
      />
      <Stack.Screen
        name="ReferralDetail"
        component={ReferralDetailScreen}
        options={{ title: 'Referral Details' }}
      />
      <Stack.Screen
        name="ReferralTimeline"
        component={ReferralTimelineScreen}
        options={{ title: 'Timeline' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.referralCode,
          headerShadowVisible: true,
        })}
      />
    </Stack.Navigator>
  );
}
