/**
 * ReferralCard — list item for referral lists and dashboard
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { StatusBadge, UrgencyBadge } from '@components/common/Badge';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { formatRelative } from '@utils/helpers';
import type { Referral } from '@types/index';

interface ReferralCardProps {
  referral: Partial<Referral> & {
    id: number;
    referralCode: string;
    status: Referral['status'];
    urgencyLevel: Referral['urgencyLevel'];
    createdAt: string;
  };
  onPress: () => void;
}

export default function ReferralCard({ referral, onPress }: ReferralCardProps) {
  const patientName =
    referral.patient && 'displayName' in referral.patient
      ? referral.patient.displayName
      : referral.patient && 'fullName' in referral.patient
      ? referral.patient.fullName
      : 'Unknown Patient';

  const otherHospital =
    referral.direction === 'incoming'
      ? referral.sourceHospital?.name
      : referral.destinationHospital?.name;

  const directionLabel = referral.direction === 'incoming' ? 'From' : 'To';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Text style={styles.referralCode}>{referral.referralCode}</Text>
        <UrgencyBadge urgency={referral.urgencyLevel} />
      </View>

      <Text style={styles.patientName}>{patientName}</Text>

      {otherHospital && (
        <View style={styles.hospitalRow}>
          <Feather
            name={referral.direction === 'incoming' ? 'arrow-down-left' : 'arrow-up-right'}
            size={IconSize.xs}
            color={Colors.textTertiary}
          />
          <Text style={styles.hospitalText}>
            {directionLabel} {otherHospital}
          </Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <StatusBadge status={referral.status} />
        <Text style={styles.timeText}>{formatRelative(referral.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  referralCode: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textSecondary,
  },
  patientName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  hospitalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  hospitalText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary },
});
