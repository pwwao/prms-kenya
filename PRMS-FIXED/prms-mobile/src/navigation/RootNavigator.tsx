/**
 * Root Navigator
 * Handles auth gating, session expiry, and routes to role-appropriate tabs.
 * Per PRMS_UserRoles_UserFlows_UITeam.md §10.2 Navigation Tree.
 */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@store/index';
import { clearSessionExpired } from '@store/slices/authSlice';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import { Colors } from '@theme/tokens';
import Toast from 'react-native-toast-message';

const Root = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, sessionExpired } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (sessionExpired) {
      Toast.show({
        type: 'error',
        text1: 'Session Expired',
        text2: 'Please log in again.',
      });
      dispatch(clearSessionExpired());
    }
  }, [sessionExpired, dispatch]);

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Root.Screen name="MainTabs" component={MainTabNavigator} />
        ) : (
          <Root.Screen name="AuthStack" component={AuthStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
