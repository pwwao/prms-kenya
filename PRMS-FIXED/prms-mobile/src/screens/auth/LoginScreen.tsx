/**
 * Login Screen
 * Per PRMS_API_Reference §2.1 — supports username/email/phone identifier.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@store/index';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { loginThunk, clearAuthError } from '@store/slices/authSlice';
import TextField from '@components/common/TextField';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing } from '@theme/tokens';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!identifier.trim()) errors.identifier = 'Username, email, or phone is required';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    dispatch(clearAuthError());

    const result = await dispatch(loginThunk({ identifier: identifier.trim(), password }));

    if (loginThunk.fulfilled.match(result)) {
      const data = result.payload;
      if (data.status === '2FA_REQUIRED' && data.preAuthToken) {
        navigation.navigate('Verify2FA', {
          preAuthToken: data.preAuthToken,
          deliveryMethod: data.deliveryMethod ?? 'TOTP',
        });
      }
      // Direct success handled by RootNavigator via isAuthenticated flag
    } else {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: (result.payload as string) ?? 'Please check your credentials',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your referrals</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username, Email, or Phone"
            placeholder="e.g. jdoe or jane@hospital.ke"
            value={identifier}
            onChangeText={(t) => {
              setIdentifier(t);
              setFieldErrors((e) => ({ ...e, identifier: undefined }));
            }}
            error={fieldErrors.identifier}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="user"
            required
          />

          <TextField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setFieldErrors((e) => ({ ...e, password: undefined }));
            }}
            error={fieldErrors.password}
            isPassword
            leftIcon="lock"
            required
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotLinkText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginButton}
          />
        </View>

        <Text style={styles.footerNote}>
          Contact your Hospital Administrator if you need an account.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  scrollContent: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: { marginBottom: Spacing.xl },
  forgotLink: { alignSelf: 'flex-end', marginBottom: Spacing.xl },
  forgotLinkText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLink,
    fontWeight: Typography.fontWeight.medium,
  },
  loginButton: { marginTop: Spacing.sm },
  footerNote: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
