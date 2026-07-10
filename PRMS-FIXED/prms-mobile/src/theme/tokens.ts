/**
 * PRMS Kenya Design Tokens
 * Architecture: All UI styling derives from these tokens.
 * Status colors, urgency indicators, typography, spacing all per
 * PRMS_UserRoles_UserFlows_UITeam.md §9
 */

// ─── Brand Colors ─────────────────────────────────────────────────────────────
export const Colors = {
  // Primary
  primary: '#0B5FFF',
  primaryDark: '#0040CC',
  primaryLight: '#E8F0FF',

  // Secondary
  secondary: '#1A9C5B',
  secondaryDark: '#147A47',
  secondaryLight: '#E6F7EE',

  // Neutral
  white: '#FFFFFF',
  black: '#0A0A0A',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  success: '#1A9C5B',
  successLight: '#E6F7EE',
  info: '#0B5FFF',
  infoLight: '#E8F0FF',

  // Status Colors — per §9.3
  statusDraft: '#0B5FFF',
  statusDraftBg: '#E8F0FF',
  statusDispatched: '#D97706',
  statusDispatchedBg: '#FFFBEB',
  statusReceived: '#9333EA',
  statusReceivedBg: '#F5F3FF',
  statusAccepted: '#1A9C5B',
  statusAcceptedBg: '#E6F7EE',
  statusRejected: '#DC2626',
  statusRejectedBg: '#FEF2F2',
  statusCompleted: '#374151',
  statusCompletedBg: '#F3F4F6',

  // Urgency Colors — per §9.4
  urgencyRoutine: '#6B7280',
  urgencyUrgent: '#D97706',
  urgencyEmergent: '#DC2626',

  // Background
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Border
  border: '#E5E7EB',
  borderFocus: '#0B5FFF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textInverse: '#FFFFFF',
  textLink: '#0B5FFF',

  // Chat
  chatOutgoing: '#0B5FFF',
  chatIncoming: '#F3F4F6',
  chatOutgoingText: '#FFFFFF',
  chatIncomingText: '#111827',

  // Offline banner
  offlineBanner: '#374151',
  syncBanner: '#0B5FFF',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── Icon Sizes ───────────────────────────────────────────────────────────────
export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
} as const;

// ─── Animation Durations ─────────────────────────────────────────────────────
export const Duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Z-Index ─────────────────────────────────────────────────────────────────
export const ZIndex = {
  base: 0,
  above: 1,
  modal: 100,
  toast: 200,
  banner: 300,
} as const;
