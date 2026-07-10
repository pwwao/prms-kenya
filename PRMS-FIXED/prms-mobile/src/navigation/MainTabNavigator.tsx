/**
 * Main Tab Navigator
 * Bottom tabs for Clinician and Receptionist per §10.2.
 * Notification badge from unread count.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import type { MainTabParamList } from './types';
import DashboardStack from './stacks/DashboardStack';
import ReferralStack from './stacks/ReferralStack';
import NotificationsStack from './stacks/NotificationsStack';
import ProfileStack from './stacks/ProfileStack';
import { Colors, Typography, Spacing } from '@theme/tokens';
import { useNotificationBadge } from '@hooks/useNotificationBadge';
import TabBarIcon from '@components/common/TabBarIcon';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { unreadCount } = useNotificationBadge();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.medium,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ReferralsTab"
        component={ReferralStack}
        options={{
          tabBarLabel: 'Referrals',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="clipboard-list" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          tabBarLabel: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.error,
            color: Colors.white,
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="bell" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
