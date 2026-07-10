/**
 * Navigation Type Definitions
 * Full navigation tree per PRMS_UserRoles_UserFlows_UITeam.md §10.2
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Verify2FA: { preAuthToken: string; deliveryMethod: 'TOTP' | 'SMS' };
  ForgotPassword: undefined;
  ChangePassword: { isFirstLogin?: boolean };
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  PatientSearch: { fromCreateReferral?: boolean };
  PatientRegistration: { prefillId?: string };
  PatientDetail: { patientId: number };
  CreateReferral: { patientId?: number };
};

export type ReferralStackParamList = {
  ReferralList: undefined;
  ReferralDetail: { referralId: number };
  ReferralTimeline: { referralId: number };
  Chat: { referralId: number; referralCode: string };
};

export type NotificationsStackParamList = {
  Notifications: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ChangePassword: { isFirstLogin?: boolean };
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  ReferralsTab: NavigatorScreenParams<ReferralStackParamList>;
  NotificationsTab: NavigatorScreenParams<NotificationsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
