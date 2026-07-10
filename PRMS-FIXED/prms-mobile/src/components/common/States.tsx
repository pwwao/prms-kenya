/**
 * LoadingView / EmptyState / ErrorState
 */
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing, IconSize } from '@theme/tokens';
import Button from './Button';

// ─── Loading ──────────────────────────────────────────────────────────────────

interface LoadingViewProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingView({ message, fullScreen = true }: LoadingViewProps) {
  return (
    <View style={[styles.center, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={[styles.center, styles.fullScreen, styles.padded]}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={IconSize['2xl']} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" style={styles.actionButton} />
      )}
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <View style={[styles.center, styles.fullScreen, styles.padded]}>
      <View style={[styles.iconCircle, styles.errorIconCircle]}>
        <Feather name="alert-triangle" size={IconSize['2xl']} color={Colors.error} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {onRetry && (
        <Button title="Try Again" onPress={onRetry} variant="primary" style={styles.actionButton} />
      )}
    </View>
  );
}

// ─── Offline Banner ───────────────────────────────────────────────────────────

interface OfflineBannerProps {
  visible: boolean;
  isSyncing?: boolean;
}

export function OfflineBanner({ visible, isSyncing }: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.offlineBanner}>
      <Feather name={isSyncing ? 'refresh-cw' : 'wifi-off'} size={IconSize.sm} color={Colors.white} />
      <Text style={styles.offlineBannerText}>
        {isSyncing ? 'Syncing...' : 'You are offline. Changes will sync when reconnected.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  fullScreen: { flex: 1 },
  padded: { paddingHorizontal: Spacing.xl },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorIconCircle: { backgroundColor: Colors.errorLight },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  actionButton: { marginTop: Spacing.xl, minWidth: 160 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.offlineBanner,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  offlineBannerText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    marginLeft: Spacing.sm,
  },
});
