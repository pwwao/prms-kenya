/**
 * Notifications Screen
 * Per PRMS_API_Reference §7 — list, mark read, mark all read.
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NotificationsStackParamList, MainTabParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import { LoadingView, EmptyState, ErrorState } from '@components/common/States';
import NotificationCard from '@components/notifications/NotificationCard';
import { Colors, Typography, Spacing } from '@theme/tokens';
import { notificationsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { APP_CONFIG } from '@constants/index';
import { useConnectivity } from '@hooks/useConnectivity';
import type { AppNotification } from '@types/index';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type Props = CompositeScreenProps<
  NativeStackScreenProps<NotificationsStackParamList, 'Notifications'>,
  BottomTabScreenProps<MainTabParamList>
>;

export default function NotificationsScreen({ navigation }: Props) {
  const { isOnline } = useConnectivity();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await notificationsApi.list({ page: pageParam, limit: APP_CONFIG.NOTIFICATIONS_PER_PAGE });
      return { items: res.data.data, pagination: res.data.meta.pagination };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? (lastPage.pagination.page ?? 1) + 1 : undefined,
    enabled: isOnline,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });

  const notifications: AppNotification[] = data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  const handlePress = (notification: AppNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    if (notification.data.referralId) {
      navigation.navigate('ReferralsTab', {
        screen: 'ReferralDetail',
        params: { referralId: notification.data.referralId },
      });
    }
  };

  return (
    <Screen edges={['bottom']}>
      {hasUnread && (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <LoadingView message="Loading notifications..." />
      ) : isError ? (
        <ErrorState message="Could not load notifications." onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell-off" title="No notifications yet" message="You're all caught up." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <NotificationCard notification={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  markAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLink,
    fontWeight: Typography.fontWeight.medium,
  },
  listContent: { padding: Spacing.base },
});
