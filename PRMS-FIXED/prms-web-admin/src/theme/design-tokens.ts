/**
 * PRMS Design Tokens
 * Patient Referral Management System — Kenya
 *
 * Signature: Triage Left-Border System
 * Every card, list item, and status surface carries a 4px left border
 * encoding urgency/status — mirrors Kenya hospital triage tag colours.
 *
 * Usage: import { tokens } from '@/tokens/design-tokens'
 */

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────

export const colors = {
  // Brand — Deep Kenyan Teal
  teal: {
    50:  '#E0F2EE',
    100: '#B3DED7',
    200: '#80C9BE',
    300: '#4DB4A5',
    400: '#26A392',
    500: '#0B6B5D', // Primary brand
    600: '#0A5E52',
    700: '#084F45',
    800: '#063F37',
    900: '#04302A',
  },

  // Accent — Warm Amber (CTAs, urgency, highlights)
  amber: {
    50:  '#FEF6E7',
    100: '#FDEBC4',
    200: '#FBDA96',
    300: '#F9C965',
    400: '#F7B83F',
    500: '#C97A15', // Accent brand
    600: '#B06810',
    700: '#8D530C',
    800: '#6A3F09',
    900: '#4A2B06',
  },

  // Semantic — Success
  success: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    500: '#16834B', // Use for Approved, Active, Completed, Accepted
    600: '#15803D',
    700: '#166534',
    900: '#064E3B',
  },

  // Semantic — Warning
  warning: {
    50:  '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    500: '#B85C00', // Use for Pending, Urgent
    600: '#A04D00',
    700: '#843F00',
  },

  // Semantic — Danger
  danger: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    500: '#B91C1C', // Use for Suspended, Rejected, Emergent
    600: '#991B1B',
    700: '#7F1D1D',
  },

  // Semantic — Info
  info: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    500: '#1E56A0', // Use for Draft, system info
    600: '#1D4ED8',
    700: '#1E40AF',
  },

  // Neutral — Blue-tinted grays (clinical)
  neutral: {
    0:   '#FFFFFF',
    50:  '#F4F7F8', // Canvas — cool clinical background
    100: '#E8EDF2',
    200: '#D8E2EA',
    300: '#B8C8D6',
    400: '#8AA0B4',
    500: '#6E8499',
    600: '#3A5068',
    700: '#2B3D52',
    800: '#1C2B3A', // Ink — primary text
    900: '#111927',
  },
} as const;

// ─── TYPOGRAPHY ────────────────────────────────────────────────────────────────
// Fonts loaded via Google Fonts CDN in index.html:
// Outfit: 400 500 600 700
// Inter: 400 500 600
// JetBrains Mono: 400 500

export const typography = {
  fontFamily: {
    display: '"Outfit", system-ui, sans-serif',   // Headings — geometric, approachable
    body:    '"Inter", system-ui, sans-serif',    // Body text, UI labels
    mono:    '"JetBrains Mono", monospace',       // Referral codes, IDs, data
  },

  fontSize: {
    '2xs': '0.625rem',  // 10px
    xs:    '0.75rem',   // 12px
    sm:    '0.875rem',  // 14px
    base:  '1rem',      // 16px
    lg:    '1.125rem',  // 18px
    xl:    '1.25rem',   // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  fontWeight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  lineHeight: {
    tight:   1.25,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
    loose:   2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight:   '-0.025em',
    normal:  '0em',
    wide:    '0.025em',
    wider:   '0.05em',
    widest:  '0.1em',
  },
} as const;

// ─── SPACING ───────────────────────────────────────────────────────────────────
// 4px base grid

export const spacing = {
  0:   '0px',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  3.5: '14px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  11:  '44px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
  28:  '112px',
  32:  '128px',
} as const;

// ─── BORDER RADIUS ─────────────────────────────────────────────────────────────

export const radius = {
  none:  '0px',
  xs:    '2px',
  sm:    '4px',
  md:    '6px',
  lg:    '8px',
  xl:    '12px',
  '2xl': '16px',
  '3xl': '24px',
  full:  '9999px',
} as const;

// ─── SHADOWS ──────────────────────────────────────────────────────────────────

export const shadows = {
  none: 'none',
  xs:   '0 1px 2px 0 rgba(28, 43, 58, 0.06)',
  sm:   '0 1px 3px 0 rgba(28, 43, 58, 0.08), 0 1px 2px -1px rgba(28, 43, 58, 0.06)',
  md:   '0 4px 6px -1px rgba(28, 43, 58, 0.08), 0 2px 4px -2px rgba(28, 43, 58, 0.06)',
  lg:   '0 10px 15px -3px rgba(28, 43, 58, 0.08), 0 4px 6px -4px rgba(28, 43, 58, 0.06)',
  xl:   '0 20px 25px -5px rgba(28, 43, 58, 0.1), 0 8px 10px -6px rgba(28, 43, 58, 0.06)',
  inner: 'inset 0 2px 4px 0 rgba(28, 43, 58, 0.06)',
} as const;

// ─── BREAKPOINTS ──────────────────────────────────────────────────────────────
// Mobile-first

export const breakpoints = {
  xs:  '320px',   // Smallest Android
  sm:  '480px',   // Large phone / small tablet
  md:  '768px',   // Tablet
  lg:  '1024px',  // Small desktop / large tablet landscape
  xl:  '1280px',  // Desktop
  '2xl': '1440px', // Large desktop
} as const;

// ─── TRIAGE BORDER SYSTEM ─────────────────────────────────────────────────────
// Signature design element: left border encodes urgency and status
// Directly mirrors Kenya hospital triage tag colours

export const triageBorder = {
  // Urgency
  Emergent: colors.danger[500],   // Red    — immediate life threat
  Urgent:   colors.amber[500],    // Amber  — needs prompt attention
  Routine:  colors.success[500],  // Green  — can wait

  // Referral Status
  Draft:      colors.info[500],     // Blue
  Dispatched: colors.teal[500],     // Teal
  Received:   colors.info[600],     // Dark blue
  Accepted:   colors.success[500],  // Green
  Rejected:   colors.danger[500],   // Red
  Completed:  colors.neutral[400],  // Grey

  // Hospital / User Status
  Pending:   colors.warning[500],   // Amber
  Approved:  colors.success[500],   // Green
  Suspended: colors.danger[500],    // Red
  Active:    colors.success[500],   // Green
  Inactive:  colors.neutral[400],   // Grey
} as const;

// ─── STATUS BADGE SYSTEM ──────────────────────────────────────────────────────

export const statusBadge = {
  Pending: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  Approved: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Suspended: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Active: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Inactive: {
    bg: colors.neutral[100],
    text: colors.neutral[500],
    border: colors.neutral[200],
  },
  Draft: {
    bg: colors.info[50],
    text: colors.info[700],
    border: colors.info[200],
  },
  Dispatched: {
    bg: colors.teal[50],
    text: colors.teal[700],
    border: colors.teal[200],
  },
  Received: {
    bg: colors.info[50],
    text: colors.info[600],
    border: colors.info[200],
  },
  Accepted: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  Rejected: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Completed: {
    bg: colors.neutral[100],
    text: colors.neutral[600],
    border: colors.neutral[200],
  },
  Emergent: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  Urgent: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  Routine: {
    bg: colors.neutral[100],
    text: colors.neutral[600],
    border: colors.neutral[200],
  },
} as const;

// ─── Z-INDEX ─────────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  dropdown: 100,
  sticky:  200,
  overlay: 300,
  modal:   400,
  toast:   500,
  tooltip: 600,
} as const;

// ─── ANIMATION ───────────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast:   '100ms',
    base:   '200ms',
    slow:   '300ms',
    slower: '500ms',
  },
  easing: {
    default:  'cubic-bezier(0.4, 0, 0.2, 1)',
    in:       'cubic-bezier(0.4, 0, 1, 1)',
    out:      'cubic-bezier(0, 0, 0.2, 1)',
    inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ─── ICON SIZES ──────────────────────────────────────────────────────────────

export const iconSize = {
  xs:  16,
  sm:  18,
  md:  20,
  lg:  24,
  xl:  28,
  '2xl': 32,
} as const;

// ─── COMPOSED TOKEN EXPORT ────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  breakpoints,
  triageBorder,
  statusBadge,
  zIndex,
  animation,
  iconSize,
} as const;

export type Tokens = typeof tokens;
export type ColorKey = keyof typeof colors;
export type TriageBorderKey = keyof typeof triageBorder;
export type StatusBadgeKey = keyof typeof statusBadge;
