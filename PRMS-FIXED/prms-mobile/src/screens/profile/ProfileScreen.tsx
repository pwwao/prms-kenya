/**
 * Profile Screen
 * Per PRMS_API_Reference §2.4 (GET /auth/me) and account settings.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import Button from '@components/common/Button';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { useAuth } from '@hooks/useAuth';
import { useConnectivity } from '@hooks/useConnectivity';
import Modal from 'react-native-modal';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, role } = useAuth();
  const { isOnline, lastSyncedAt } = useConnectivity();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) ?? '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
          <Text style={styles.hospitalName}>{user?.hospitalName}</Text>
        </View>

        {/* Connectivity Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Feather
              name={isOnline ? 'wifi' : 'wifi-off'}
              size={IconSize.sm}
              color={isOnline ? Colors.secondary : Colors.error}
            />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          {lastSyncedAt && (
            <Text style={styles.syncText}>Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</Text>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>

          <MenuItem
            icon="lock"
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword', {})}
          />
          <MenuItem icon="mail" label={user?.email ?? '—'} disabled />
          <MenuItem icon="phone" label={user?.phoneNumber ?? '—'} disabled />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>About</Text>
          <MenuItem icon="info" label="App Version 1.0.0" disabled />
          <MenuItem icon="shield" label="Privacy & Data Policy" onPress={() => {}} />
        </View>

        <Button
          title="Log Out"
          variant="outline"
          onPress={() => setShowLogoutConfirm(true)}
          style={styles.logoutButton}
        />
      </ScrollView>

      <Modal isVisible={showLogoutConfirm} onBackdropPress={() => setShowLogoutConfirm(false)} style={styles.modal}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Log Out</Text>
          <Text style={styles.modalSubtitle}>Are you sure you want to log out?</Text>
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowLogoutConfirm(false)}
              style={styles.modalActionButton}
            />
            <Button title="Log Out" variant="danger" onPress={handleLogout} style={styles.modalActionButton} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <Feather name={icon} size={IconSize.md} color={Colors.gray500} />
      <Text style={styles.menuItemLabel}>{label}</Text>
      {onPress && !disabled && (
        <Feather name="chevron-right" size={IconSize.md} color={Colors.gray400} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  roleBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semiBold,
  },
  hospitalName: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  syncText: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuSectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
  },
  logoutButton: { marginTop: Spacing.lg },
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: Spacing.md },
  modalActionButton: { flex: 1 },
});
