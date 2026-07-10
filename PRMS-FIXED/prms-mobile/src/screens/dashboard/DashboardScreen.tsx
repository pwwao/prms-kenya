/**
 * Dashboard Screen
 * Role-based home screen per PRMS_UserRoles_UserFlows_UITeam.md §4 / §5.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { DashboardStackParamList, MainTabParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView } from '@components/common/States';
import { Colors, Typography, Spacing, Radius, Shadows, IconSize } from '@theme/tokens';
import { useAuth } from '@hooks/useAuth';
import { useConnectivity } from '@hooks/useConnectivity';
import { OfflineBanner } from '@components/common/States';
import { referralsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import ReferralCard from '@components/referral/ReferralCard';
import { useNavigation } from '@react-navigation/native';

type Props = CompositeScreenProps<
  NativeStackScreenProps<DashboardStackParamList, 'Dashboard'>,
  BottomTabScreenProps<MainTabParamList>
>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, isClinician, isReceptionist } = useAuth();
  const { isOnline, isSyncing } = useConnectivity();

  const { data: urgentReferrals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.referrals.all({ urgencyLevel: 'Emergent,Urgent', limit: 5 }),
    queryFn: async () => {
      const res = await referralsApi.list({
        urgencyLevel: 'Emergent',
        limit: 5,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });
      return res.data.data;
    },
    enabled: isOnline,
  });

  const { data: counts } = useQuery({
    queryKey: ['referrals', 'counts'],
    queryFn: async () => {
      const [incoming, outgoing] = await Promise.all([
        referralsApi.list({ direction: 'incoming', status: 'Dispatched,Received', limit: 1 }),
        referralsApi.list({ direction: 'outgoing', status: 'Draft,Dispatched,Rejected', limit: 1 }),
      ]);
      return {
        incomingPending: incoming.data.meta.pagination?.total ?? 0,
        outgoingPending: outgoing.data.meta.pagination?.total ?? 0,
      };
    },
    enabled: isOnline,
  });

  const greeting = getGreeting();

  return (
    <Screen edges={['top']}>
      <OfflineBanner visible={!isOnline} isSyncing={isSyncing} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.fullName ?? 'User'}</Text>
            <Text style={styles.hospitalName}>{user?.hospitalName}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {(isClinician || isReceptionist) && (
            <QuickActionCard
              icon="user-plus"
              label="Register Patient"
              color={Colors.primary}
              onPress={() => navigation.navigate('PatientRegistration', {})}
            />
          )}
          {isClinician && (
            <QuickActionCard
              icon="send"
              label="New Referral"
              color={Colors.secondary}
              onPress={() => navigation.navigate('PatientSearch', { fromCreateReferral: true })}
            />
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Incoming Pending"
            value={counts?.incomingPending ?? 0}
            icon="inbox"
            color={Colors.statusDispatched}
            onPress={() =>
              navigation.getParent()?.navigate('ReferralsTab', {
                screen: 'ReferralList',
              })
            }
          />
          <SummaryCard
            label="Outgoing Active"
            value={counts?.outgoingPending ?? 0}
            icon="send"
            color={Colors.primary}
            onPress={() =>
              navigation.getParent()?.navigate('ReferralsTab', {
                screen: 'ReferralList',
              })
            }
          />
        </View>

        {/* Urgent Referrals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergent Referrals</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.getParent()?.navigate('ReferralsTab', { screen: 'ReferralList' })
              }
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <LoadingView fullScreen={false} />
          ) : !urgentReferrals || urgentReferrals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="check-circle" size={IconSize.lg} color={Colors.secondary} />
              <Text style={styles.emptyCardText}>No emergent referrals right now</Text>
            </View>
          ) : (
            urgentReferrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                onPress={() =>
                  navigation.getParent()?.navigate('ReferralsTab', {
                    screen: 'ReferralDetail',
                    params: { referralId: referral.id },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuickActionCard({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon} size={IconSize.lg} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onPress} activeOpacity={0.7}>
      <Feather name={icon} size={IconSize.md} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  scrollContent: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  header: { marginBottom: Spacing.xl },
  greeting: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  userName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  hospitalName: { fontSize: Typography.fontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  summaryValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  summaryLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLink,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
