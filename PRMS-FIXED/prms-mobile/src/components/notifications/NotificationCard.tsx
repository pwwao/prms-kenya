/**
 * NotificationCard — notification list item
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { formatRelative } from '@utils/helpers';
import type { AppNotification, NotificationType } from '@types/index';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  REFERRAL_DISPATCHED: 'send',
  REFERRAL_RECEIVED: 'inbox',
  REFERRAL_ACCEPTED: 'check-circle',
  REFERRAL_REJECTED: 'x-circle',
  REFERRAL_COMPLETED: 'check-square',
  MESSAGE_RECEIVED: 'message-circle',
  HOSPITAL_APPROVED: 'shield',
  HOSPITAL_SUSPENDED: 'alert-triangle',
  ACCOUNT_SUSPENDED: 'user-x',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  REFERRAL_DISPATCHED: Colors.statusDispatched,
  REFERRAL_RECEIVED: Colors.statusReceived,
  REFERRAL_ACCEPTED: Colors.statusAccepted,
  REFERRAL_REJECTED: Colors.statusRejected,
  REFERRAL_COMPLETED: Colors.statusCompleted,
  MESSAGE_RECEIVED: Colors.primary,
  HOSPITAL_APPROVED: Colors.secondary,
  HOSPITAL_SUSPENDED: Colors.error,
  ACCOUNT_SUSPENDED: Colors.error,
};

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

export default function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const icon = NOTIFICATION_ICONS[notification.type] ?? 'bell';
  const color = NOTIFICATION_COLORS[notification.type] ?? Colors.gray500;

  return (
    <TouchableOpacity
      style={[styles.card, !notification.isRead && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon} size={IconSize.md} color={color} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.time}>{formatRelative(notification.createdAt)}</Text>
      </View>

      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardUnread: { backgroundColor: Colors.primaryLight },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: { flex: 1 },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  body: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  time: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    marginTop: 4,
  },
});
