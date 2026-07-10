/**
 * PRMS MUI v5 Theme
 * Overrides Material UI defaults to match PRMS design tokens.
 *
 * Usage:
 *   import { theme } from '@/theme/theme.mui'
 *   <ThemeProvider theme={theme}><App /></ThemeProvider>
 */

import { createTheme, alpha } from '@mui/material/styles';
import { colors, typography, radius, shadows, animation } from './design-tokens';

// Extend MUI type declarations for custom palette entries
declare module '@mui/material/styles' {
  interface Palette {
    teal: Palette['primary'];
    amber: Palette['primary'];
  }
  interface PaletteOptions {
    teal?: PaletteOptions['primary'];
    amber?: PaletteOptions['primary'];
  }
}

export const theme = createTheme({
  // ─── PALETTE ──────────────────────────────────────────────────────────────
  palette: {
    mode: 'light',

    primary: {
      light:        colors.teal[400],
      main:         colors.teal[500],
      dark:         colors.teal[700],
      contrastText: '#FFFFFF',
    },

    secondary: {
      light:        colors.amber[400],
      main:         colors.amber[500],
      dark:         colors.amber[700],
      contrastText: '#FFFFFF',
    },

    error: {
      light:        colors.danger[100],
      main:         colors.danger[500],
      dark:         colors.danger[700],
      contrastText: '#FFFFFF',
    },

    warning: {
      light:        colors.warning[50],
      main:         colors.warning[500],
      dark:         colors.warning[700],
      contrastText: '#FFFFFF',
    },

    success: {
      light:        colors.success[100],
      main:         colors.success[500],
      dark:         colors.success[700],
      contrastText: '#FFFFFF',
    },

    info: {
      light:        colors.info[100],
      main:         colors.info[500],
      dark:         colors.info[700],
      contrastText: '#FFFFFF',
    },

    text: {
      primary:   colors.neutral[800],
      secondary: colors.neutral[600],
      disabled:  colors.neutral[400],
    },

    background: {
      default: colors.neutral[50],   // Cool clinical canvas
      paper:   colors.neutral[0],    // Pure white for cards
    },

    divider: colors.neutral[200],

    // Custom
    teal: {
      light:        colors.teal[100],
      main:         colors.teal[500],
      dark:         colors.teal[700],
      contrastText: '#FFFFFF',
    },
    amber: {
      light:        colors.amber[100],
      main:         colors.amber[500],
      dark:         colors.amber[700],
      contrastText: '#FFFFFF',
    },
  },

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────
  typography: {
    fontFamily: typography.fontFamily.body,

    h1: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '2.25rem',
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      color: colors.neutral[800],
    },
    h2: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.875rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      color: colors.neutral[800],
    },
    h3: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.5rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      color: colors.neutral[800],
    },
    h4: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.25rem',
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      color: colors.neutral[800],
    },
    h5: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1.125rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.snug,
    },
    h6: {
      fontFamily: typography.fontFamily.display,
      fontSize:   '1rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
    },
    subtitle1: {
      fontSize:   '1rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[700],
    },
    subtitle2: {
      fontSize:   '0.875rem',
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[600],
    },
    body1: {
      fontSize:   '0.9375rem',
      lineHeight: typography.lineHeight.relaxed,
      color: colors.neutral[700],
    },
    body2: {
      fontSize:   '0.875rem',
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[600],
    },
    caption: {
      fontSize:   '0.75rem',
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[500],
    },
    overline: {
      fontSize:      '0.6875rem',
      fontWeight:    typography.fontWeight.semibold,
      letterSpacing: typography.letterSpacing.widest,
      textTransform: 'uppercase',
      color: colors.neutral[500],
    },
    button: {
      fontFamily:    typography.fontFamily.body,
      fontWeight:    typography.fontWeight.semibold,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'none',
    },
  },

  // ─── SHAPE ───────────────────────────────────────────────────────────────
  shape: {
    borderRadius: 6,
  },

  // ─── COMPONENT OVERRIDES ─────────────────────────────────────────────────
  components: {

    // ── MuiCssBaseline ────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
        }

        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        body {
          background-color: ${colors.neutral[50]};
          color: ${colors.neutral[800]};
        }

        /* Referral / Patient ID — monospace */
        .prms-code {
          font-family: ${typography.fontFamily.mono};
          font-size: 0.875rem;
          letter-spacing: 0.025em;
          color: ${colors.teal[700]};
          background: ${colors.teal[50]};
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Triage border utility classes */
        .triage-emergent { border-left: 4px solid ${colors.danger[500]}; }
        .triage-urgent   { border-left: 4px solid ${colors.amber[500]}; }
        .triage-routine  { border-left: 4px solid ${colors.success[500]}; }

        /* Focus visible — accessibility */
        :focus-visible {
          outline: 2px solid ${colors.teal[500]};
          outline-offset: 2px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${colors.neutral[100]}; }
        ::-webkit-scrollbar-thumb { background: ${colors.neutral[300]}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.neutral[400]}; }
      `,
    },

    // ── MuiButton ────────────────────────────────────────────────────────
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          padding: '9px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: `all ${animation.duration.base} ${animation.easing.default}`,
          '&:focus-visible': {
            outline: `2px solid ${colors.teal[500]}`,
            outlineOffset: '2px',
          },
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
        },
        containedPrimary: {
          background: colors.teal[500],
          '&:hover': {
            background: colors.teal[600],
          },
          '&:active': {
            background: colors.teal[700],
          },
        },
        containedSecondary: {
          background: colors.amber[500],
          '&:hover': {
            background: colors.amber[600],
          },
        },
        outlinedPrimary: {
          borderColor: colors.teal[300],
          color: colors.teal[600],
          '&:hover': {
            background: colors.teal[50],
            borderColor: colors.teal[500],
          },
        },
        textPrimary: {
          color: colors.teal[600],
          '&:hover': {
            background: colors.teal[50],
          },
        },
      },
    },

    // ── MuiTextField ─────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: colors.neutral[0],
          fontSize: '0.9375rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[300],
            transition: `border-color ${animation.duration.base} ${animation.easing.default}`,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.neutral[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.teal[500],
            borderWidth: '1.5px',
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.danger[500],
          },
          '&.Mui-disabled': {
            backgroundColor: colors.neutral[100],
          },
        },
        input: {
          padding: '9px 12px',
          '&::placeholder': {
            color: colors.neutral[400],
            opacity: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: colors.neutral[600],
          fontWeight: 500,
          '&.Mui-focused': {
            color: colors.teal[600],
          },
          '&.Mui-error': {
            color: colors.danger[600],
          },
        },
      },
    },

    // ── MuiCard ──────────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${colors.neutral[200]}`,
          borderRadius: radius.xl,
          boxShadow: shadows.sm,
          backgroundColor: colors.neutral[0],
          transition: `box-shadow ${animation.duration.base} ${animation.easing.default}`,
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },

    // ── MuiChip (used for status badges) ─────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.full,
          fontSize: '0.75rem',
          fontWeight: 600,
          height: '22px',
        },
        label: {
          padding: '0 8px',
        },
      },
    },

    // ── MuiTableCell ─────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          borderBottom: `1px solid ${colors.neutral[100]}`,
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.neutral[500],
          background: colors.neutral[50],
          borderBottom: `2px solid ${colors.neutral[200]}`,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(colors.teal[500], 0.04),
            cursor: 'pointer',
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.teal[500], 0.08),
            '&:hover': {
              backgroundColor: alpha(colors.teal[500], 0.12),
            },
          },
        },
      },
    },

    // ── MuiAlert ─────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          fontSize: '0.875rem',
          alignItems: 'flex-start',
        },
        filledSuccess: { backgroundColor: colors.success[500] },
        filledError:   { backgroundColor: colors.danger[500] },
        filledWarning: { backgroundColor: colors.warning[500] },
      },
    },

    // ── MuiLinearProgress ────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: radius.full,
          height: 6,
          backgroundColor: colors.teal[100],
        },
        bar: {
          borderRadius: radius.full,
          backgroundColor: colors.teal[500],
        },
      },
    },

    // ── MuiSkeleton ──────────────────────────────────────────────────────
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[100],
          borderRadius: radius.md,
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha(colors.neutral[0], 0.7)}, transparent)`,
          },
        },
      },
    },

    // ── MuiPaper ─────────────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: `1px solid ${colors.neutral[200]}`,
        },
      },
    },

    // ── MuiDivider ───────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.neutral[100],
        },
      },
    },

    // ── MuiTooltip ───────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.neutral[800],
          fontSize: '0.75rem',
          borderRadius: radius.md,
          padding: '5px 10px',
        },
        arrow: {
          color: colors.neutral[800],
        },
      },
    },

    // ── MuiBreadcrumbs ───────────────────────────────────────────────────
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: colors.neutral[500],
        },
      },
    },

    // ── MuiTab ───────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.875rem',
          textTransform: 'none',
          minHeight: '44px',
          padding: '8px 16px',
          '&.Mui-selected': {
            color: colors.teal[600],
            fontWeight: 600,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: colors.teal[500],
          height: '2.5px',
          borderRadius: '2px 2px 0 0',
        },
      },
    },

    // ── MuiSwitch ────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: colors.teal[500],
            '& + .MuiSwitch-track': {
              backgroundColor: colors.teal[400],
              opacity: 1,
            },
          },
        },
      },
    },
  },
});

export default theme;
