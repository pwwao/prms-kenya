/**
 * Dashboard Stack
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../types';
import DashboardScreen from '@screens/dashboard/DashboardScreen';
import PatientSearchScreen from '@screens/patients/PatientSearchScreen';
import PatientRegistrationScreen from '@screens/patients/PatientRegistrationScreen';
import PatientDetailScreen from '@screens/patients/PatientDetailScreen';
import CreateReferralScreen from '@screens/referrals/CreateReferralScreen';
import { Colors, Typography } from '@theme/tokens';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStack() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PatientSearch"
        component={PatientSearchScreen}
        options={{ title: 'Find Patient' }}
      />
      <Stack.Screen
        name="PatientRegistration"
        component={PatientRegistrationScreen}
        options={{ title: 'Register Patient', gestureEnabled: false }}
      />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={{ title: 'Patient Record' }}
      />
      <Stack.Screen
        name="CreateReferral"
        component={CreateReferralScreen}
        options={{ title: 'Create Referral', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
