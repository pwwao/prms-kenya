/**
 * Badge Component — Status & Urgency Pills
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing, Radius } from '@theme/tokens';
import { getStatusColor, getStatusBgColor, getUrgencyColor } from '@utils/helpers';
import type { ReferralStatus, UrgencyLevel } from '@types/index';

interface StatusBadgeProps {
  status: ReferralStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: getStatusBgColor(status) }]}>
      <Text style={[styles.badgeText, { color: getStatusColor(status) }]}>{status}</Text>
    </View>
  );
}

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  compact?: boolean;
}

export function UrgencyBadge({ urgency, compact }: UrgencyBadgeProps) {
  const color = getUrgencyColor(urgency);
  return (
    <View style={[styles.urgencyBadge, { borderColor: color }]}>
      <View style={[styles.urgencyDot, { backgroundColor: color }]} />
      {!compact && <Text style={[styles.urgencyText, { color }]}>{urgency}</Text>}
    </View>
  );
}

interface GenericBadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function Badge({ label, color, bgColor }: GenericBadgeProps) {
  return (
    <View style={[styles.badge, bgColor ? { backgroundColor: bgColor } : undefined]}>
      <Text style={[styles.badgeText, color ? { color } : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3, marginRight: Spacing.xs },
  urgencyText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semiBold },
});
