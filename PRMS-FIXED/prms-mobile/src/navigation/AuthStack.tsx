import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import SplashScreen from '@screens/auth/SplashScreen';
import LoginScreen from '@screens/auth/LoginScreen';
import Verify2FAScreen from '@screens/auth/Verify2FAScreen';
import ForgotPasswordScreen from '@screens/auth/ForgotPasswordScreen';
import ChangePasswordScreen from '@screens/auth/ChangePasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Verify2FA"
        component={Verify2FAScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}
