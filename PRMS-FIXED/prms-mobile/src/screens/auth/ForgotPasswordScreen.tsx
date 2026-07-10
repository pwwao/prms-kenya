/**
 * Forgot Password Screen
 * Per PRMS_API_Reference §2.5
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { authApi } from '@api/services';
import TextField from '@components/common/TextField';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing } from '@theme/tokens';
import Feather from 'react-native-vector-icons/Feather';
import { IconSize } from '@theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      // Generic message regardless of whether email exists (security)
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successIconCircle}>
          <Feather name="mail" size={IconSize['2xl']} color={Colors.secondary} />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          If an account exists for {email}, we've sent password reset instructions.
          The link expires in 30 minutes.
        </Text>
        <Button
          title="Back to Login"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="arrow-left" size={IconSize.lg} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      <TextField
        label="Email Address"
        placeholder="jane@hospital.ke"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError('');
        }}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Button title="Send Reset Link" onPress={handleSubmit} loading={isLoading} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, padding: Spacing.xl, paddingTop: Spacing['3xl'] },
  backButton: { marginBottom: Spacing.lg, alignSelf: 'flex-start' },
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
    marginBottom: Spacing['2xl'],
  },
  button: { marginTop: Spacing.md },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    alignSelf: 'center',
  },
});
