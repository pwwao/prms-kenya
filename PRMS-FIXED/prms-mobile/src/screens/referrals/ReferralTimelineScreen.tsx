/**
 * Referral Timeline Screen
 * Per PRMS_API_Reference §4.3 — timeline array within referral detail response.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReferralStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView, ErrorState, EmptyState } from '@components/common/States';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { referralsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { formatDateTime, getStatusColor } from '@utils/helpers';
import type { ReferralStatus } from '@types/index';

type Props = NativeStackScreenProps<ReferralStackParamList, 'ReferralTimeline'>;

const STATUS_ICONS: Record<ReferralStatus, string> = {
  Draft: 'file-text',
  Dispatched: 'send',
  Received: 'inbox',
  Accepted: 'check-circle',
  Rejected: 'x-circle',
  Completed: 'check-square',
};

export default function ReferralTimelineScreen({ route }: Props) {
  const { referralId } = route.params;

  const { data: referral, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.referrals.detail(referralId),
    queryFn: async () => {
      const res = await referralsApi.getById(referralId);
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingView message="Loading timeline..." />;
  if (error || !referral) {
    return <ErrorState message="Could not load timeline." onRetry={refetch} />;
  }

  const timeline = referral.timeline ?? [];

  if (timeline.length === 0) {
    return <EmptyState icon="clock" title="No timeline events yet" />;
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.referralCode}>{referral.referralCode}</Text>

        <View style={styles.timelineList}>
          {timeline.map((entry, index) => {
            const isLast = index === timeline.length - 1;
            const color = getStatusColor(entry.status);

            return (
              <View key={`${entry.status}-${entry.timestamp}`} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIconCircle, { backgroundColor: `${color}1A` }]}>
                    <Feather
                      name={STATUS_ICONS[entry.status] ?? 'circle'}
                      size={IconSize.sm}
                      color={color}
                    />
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{entry.status}</Text>
                  <Text style={styles.timelineTimestamp}>{formatDateTime(entry.timestamp)}</Text>
                  <Text style={styles.timelineActor}>by {entry.actionBy.fullName}</Text>
                  {entry.notes && <Text style={styles.timelineNotes}>{entry.notes}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  referralCode: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  timelineList: {},
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', marginRight: Spacing.md },
  timelineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: Spacing.xs },
  timelineContent: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  timelineStatus: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  timelineTimestamp: { fontSize: Typography.fontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  timelineActor: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  timelineNotes: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
