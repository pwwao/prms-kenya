/**
 * Change Password Screen
 * Per PRMS_API_Reference §2.6. Also handles forced first-login password change
 * per PRMS_UserRoles_UserFlows_UITeam.md §3.1.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@api/services';
import TextField from '@components/common/TextField';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing } from '@theme/tokens';
import { isStrongPassword, extractApiError } from '@utils/helpers';
import Toast from 'react-native-toast-message';
import { useAuth } from '@hooks/useAuth';

type Props = NativeStackScreenProps<any, 'ChangePassword'>;

export default function ChangePasswordScreen({ navigation, route }: Props) {
  const isFirstLogin = route.params?.isFirstLogin ?? false;
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!isFirstLogin && !currentPassword) next.currentPassword = 'Current password is required';
    if (!isStrongPassword(newPassword)) {
      next.newPassword =
        'Min 12 chars with uppercase, lowercase, number, and special character';
    }
    if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    if (newPassword === currentPassword && currentPassword) {
      next.newPassword = 'New password must differ from current password';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      Toast.show({ type: 'success', text1: 'Password updated successfully' });

      if (isFirstLogin) {
        // Re-login flow: force logout so user signs in with new password
        await logout();
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: extractApiError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {isFirstLogin && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            For your security, you must set a new password before continuing.
          </Text>
        </View>
      )}

      {!isFirstLogin && (
        <TextField
          label="Current Password"
          value={currentPassword}
          onChangeText={(t) => {
            setCurrentPassword(t);
            setErrors((e) => ({ ...e, currentPassword: undefined as never }));
          }}
          error={errors.currentPassword}
          isPassword
          leftIcon="lock"
          required
        />
      )}

      <TextField
        label="New Password"
        value={newPassword}
        onChangeText={(t) => {
          setNewPassword(t);
          setErrors((e) => ({ ...e, newPassword: undefined as never }));
        }}
        error={errors.newPassword}
        hint="Min 12 characters, with uppercase, lowercase, number & symbol"
        isPassword
        leftIcon="lock"
        required
      />

      <TextField
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          setErrors((e) => ({ ...e, confirmPassword: undefined as never }));
        }}
        error={errors.confirmPassword}
        isPassword
        leftIcon="lock"
        required
      />

      <Button
        title="Update Password"
        onPress={handleSubmit}
        loading={isLoading}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, backgroundColor: Colors.white, flexGrow: 1 },
  noticeBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  noticeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.warning,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
  },
  submitButton: { marginTop: Spacing.md },
});
