/**
 * Verify 2FA Screen
 * Per PRMS_API_Reference §2.2 — TOTP/SMS OTP verification.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@store/index';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { verify2FAThunk } from '@store/slices/authSlice';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing, Radius } from '@theme/tokens';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verify2FA'>;

const OTP_LENGTH = 6;

export default function Verify2FAScreen({ route }: Props) {
  const { preAuthToken, deliveryMethod } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((s: RootState) => s.auth);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(deliveryMethod === 'SMS' ? 60 : 0);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      Toast.show({ type: 'error', text1: 'Enter the complete 6-digit code' });
      return;
    }

    const result = await dispatch(verify2FAThunk({ preAuthToken, otpCode: code }));

    if (verify2FAThunk.rejected.match(result)) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: (result.payload as string) ?? 'Invalid or expired code',
      });
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
    // Success: RootNavigator switches automatically via isAuthenticated
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          {deliveryMethod === 'SMS'
            ? 'Enter the 6-digit code sent to your phone'
            : 'Enter the 6-digit code from your authenticator app'}
        </Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[styles.otpBox, digit && styles.otpBoxFilled]}
            value={digit}
            onChangeText={(t) => handleDigitChange(t, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            autoFocus={index === 0}
          />
        ))}
      </View>

      <Button
        title="Verify"
        onPress={handleVerify}
        loading={isLoading}
        style={styles.verifyButton}
      />

      {deliveryMethod === 'SMS' && (
        <TouchableOpacity
          disabled={resendCooldown > 0}
          onPress={() => setResendCooldown(60)}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, padding: Spacing.xl, paddingTop: Spacing['4xl'] },
  header: { marginBottom: Spacing['2xl'] },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['2xl'],
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  verifyButton: { marginBottom: Spacing.lg },
  resendButton: { alignSelf: 'center' },
  resendText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLink,
    fontWeight: Typography.fontWeight.medium,
  },
  resendTextDisabled: { color: Colors.textTertiary },
});
