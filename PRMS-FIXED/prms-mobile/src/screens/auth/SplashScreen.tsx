/**
 * Splash Screen
 * Checks for existing valid session and routes accordingly.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@store/index';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { tokenStorage, userStorage } from '@utils/tokenStorage';
import { setAuthenticated } from '@store/slices/authSlice';
import { Colors, Typography, Spacing } from '@theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = await tokenStorage.getAccessToken();
      const user = userStorage.getUser();

      if (accessToken && user) {
        dispatch(setAuthenticated(user));
        // RootNavigator will switch to MainTabs automatically since
        // isAuthenticated becomes true.
      } else {
        navigation.replace('Login');
      }
    };

    const timer = setTimeout(bootstrap, 600); // brief brand moment
    return () => clearTimeout(timer);
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>P</Text>
      </View>
      <Text style={styles.appName}>PRMS Kenya</Text>
      <Text style={styles.tagline}>Patient Referral Management</Text>
      <ActivityIndicator color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  appName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  tagline: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  loader: { marginTop: Spacing['3xl'] },
});
