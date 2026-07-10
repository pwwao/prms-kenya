/**
 * Notification types — mirrors PRMS mobile `AppNotification`.
 * See PRMS_API_Reference_v1.0.md §7.
 */

export type NotificationType =
  | 'REFERRAL_DISPATCHED'
  | 'REFERRAL_RECEIVED'
  | 'REFERRAL_ACCEPTED'
  | 'REFERRAL_REJECTED'
  | 'REFERRAL_COMPLETED'
  | 'MESSAGE_RECEIVED'
  | 'HOSPITAL_APPROVED'
  | 'HOSPITAL_SUSPENDED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data: {
    referralId?: number;
    referralCode?: string;
    hospitalId?: number;
  };
  createdAt: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
