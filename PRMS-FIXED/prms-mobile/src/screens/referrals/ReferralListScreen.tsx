/**
 * Referral List Screen
 * Per PRMS_API_Reference §4.2 — filterable, paginated list.
 * Per PRMS_UserRoles_UserFlows_UITeam.md §5 — incoming/outgoing tabs.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReferralStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView, EmptyState, ErrorState, OfflineBanner } from '@components/common/States';
import ReferralCard from '@components/referral/ReferralCard';
import { Colors, Typography, Spacing, Radius, IconSize } from '@theme/tokens';
import { referralsApi } from '@api/services';
import { APP_CONFIG } from '@constants/index';
import { useConnectivity } from '@hooks/useConnectivity';
import { useDebounce } from '@hooks/useDebounce';
import TextField from '@components/common/TextField';
import type { Referral, ReferralDirection } from '@types/index';

type Props = NativeStackScreenProps<ReferralStackParamList, 'ReferralList'>;

type FilterTab = 'incoming' | 'outgoing';

const STATUS_FILTERS = ['All', 'Draft', 'Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed'];

export default function ReferralListScreen({ navigation }: Props) {
  const { isOnline, isSyncing } = useConnectivity();
  const [activeTab, setActiveTab] = useState<FilterTab>('incoming');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['referrals', activeTab, statusFilter, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await referralsApi.list({
        direction: activeTab,
        status: statusFilter === 'All' ? undefined : statusFilter,
        q: debouncedSearch || undefined,
        page: pageParam,
        limit: APP_CONFIG.REFERRALS_PER_PAGE,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });
      return {
        items: res.data.data,
        pagination: res.data.meta.pagination,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? (lastPage.pagination.page ?? 1) + 1 : undefined,
    enabled: isOnline,
  });

  const referrals: Referral[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen edges={['bottom']}>
      <OfflineBanner visible={!isOnline} isSyncing={isSyncing} />

      {/* Direction Tabs */}
      <View style={styles.tabRow}>
        <TabButton
          label="Incoming"
          icon="arrow-down-left"
          active={activeTab === 'incoming'}
          onPress={() => setActiveTab('incoming')}
        />
        <TabButton
          label="Outgoing"
          icon="arrow-up-right"
          active={activeTab === 'outgoing'}
          onPress={() => setActiveTab('outgoing')}
        />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextField
          placeholder="Search by referral code or patient"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchField}
        />
      </View>

      {/* Status Filter Chips */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, statusFilter === item && styles.chipActive]}
            onPress={() => setStatusFilter(item)}
          >
            <Text style={[styles.chipText, statusFilter === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {isLoading ? (
        <LoadingView message="Loading referrals..." />
      ) : isError ? (
        <ErrorState message="Could not load referrals." onRetry={refetch} />
      ) : referrals.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title={`No ${activeTab} referrals`}
          message={
            statusFilter !== 'All'
              ? `No ${statusFilter.toLowerCase()} referrals found`
              : 'Referrals will appear here once created'
          }
        />
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <ReferralCard
              referral={item}
              onPress={() => navigation.navigate('ReferralDetail', { referralId: item.id })}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? <LoadingView fullScreen={false} /> : null
          }
        />
      )}
    </Screen>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Feather name={icon} size={IconSize.sm} color={active ? Colors.primary : Colors.gray500} />
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: Colors.primary },
  tabButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray500,
    marginLeft: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  tabButtonTextActive: { color: Colors.primary, fontWeight: Typography.fontWeight.semiBold },
  searchRow: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md },
  searchField: { marginBottom: 0 },
  chipRow: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white, fontWeight: Typography.fontWeight.semiBold },
  listContent: { padding: Spacing.base },
});
