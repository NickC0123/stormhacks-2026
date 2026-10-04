import type { TextStyle, ViewStyle } from 'react-native';

import { fonts } from '@/theme/fonts';

/** Primitive color ramps. Components must not consume these directly. */
export const primitives = {
  gray0: '#ffffff',
  gray50: '#f8fafc',
  /** App page canvas (light). Closer to cool white than gray-50. */
  page: '#fbfcff',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  gray950: '#020617',
  teal400: '#00d2e0',
  teal500: '#00c3d0',
  teal600: '#00a3ae',
  teal700: '#007a85',
  red50: '#fef2f2',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
  /** Success snackbar (Figma `22:3938`) — emerald. */
  emerald100: '#d1fae5',
  emerald300: '#6ee7b7',
  emerald700: '#047857',
  /** Opaque success surface for dark mode. */
  emerald900: '#064e3b',
  iosGray6: '#f2f2f7',
  iosGray6Dark: '#1c1c1e',
  glyphPrimary: '#595959',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  bgPage: string;
  bgSurface: string;
  bgSurfaceAlt: string;
  bgElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  /** Placeholder / hint text — lighter than tertiary. */
  textPlaceholder: string;
  textInverse: string;
  borderSubtle: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSubtle: string;
  /** Icon/label color on accent fills. Product design uses white (see Figma bottom nav FAB). */
  onAccent: string;
  /** Accent-colored text/icons on neutral surfaces when stronger contrast is required. */
  accentStrong: string;
  danger: string;
  dangerActive: string;
  dangerSubtle: string;
  /** Label color on danger fills. */
  onDanger: string;
  navBar: string;
  navItemActiveBg: string;
  navItemActive: string;
  navItemInactive: string;
  /** Success snackbar surface + label/icon (Figma). */
  successSubtle: string;
  success: string;
};

export function createColors(scheme: ColorScheme): ThemeColors {
  if (scheme === 'dark') {
    return {
      bgPage: primitives.gray950,
      bgSurface: primitives.gray900,
      bgSurfaceAlt: primitives.gray800,
      bgElevated: primitives.gray800,
      textPrimary: primitives.gray50,
      textSecondary: primitives.gray300,
      textTertiary: primitives.gray400,
      textPlaceholder: primitives.gray500,
      textInverse: primitives.gray900,
      borderSubtle: primitives.gray800,
      accent: primitives.teal400,
      accentHover: primitives.teal400,
      accentActive: primitives.teal500,
      accentSubtle: 'rgba(0, 210, 224, 0.15)',
      onAccent: primitives.gray0,
      accentStrong: primitives.teal400,
      danger: primitives.red500,
      dangerActive: primitives.red600,
      dangerSubtle: 'rgba(239, 68, 68, 0.15)',
      onDanger: primitives.gray0,
      navBar: primitives.iosGray6Dark,
      navItemActiveBg: primitives.gray700,
      navItemActive: primitives.teal400,
      navItemInactive: primitives.gray400,
      successSubtle: primitives.emerald900,
      success: primitives.emerald300,
    };
  }

  return {
    bgPage: primitives.page,
    bgSurface: primitives.gray0,
    bgSurfaceAlt: primitives.gray100,
    bgElevated: primitives.gray0,
    textPrimary: primitives.gray900,
    textSecondary: primitives.gray600,
    textTertiary: primitives.gray500,
    textPlaceholder: primitives.gray400,
    textInverse: primitives.gray0,
    borderSubtle: primitives.gray200,
    accent: primitives.teal500,
    accentHover: primitives.teal400,
    accentActive: primitives.teal600,
    accentSubtle: '#e6fafb',
    onAccent: primitives.gray0,
    accentStrong: primitives.teal700,
    danger: primitives.red600,
    dangerActive: primitives.red700,
    dangerSubtle: primitives.red50,
    onDanger: primitives.gray0,
    navBar: primitives.iosGray6,
    navItemActiveBg: primitives.gray0,
    navItemActive: primitives.teal500,
    navItemInactive: primitives.glyphPrimary,
    successSubtle: primitives.emerald100,
    success: primitives.emerald700,
  };
}

/** 4pt spacing scale (matches design-spec `--space-*`). */
export const spacing = {
  0: 0,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** iOS sheet / create-action alert corners (Figma Sheet/iPhone/Top Radius). */
  sheet: 34,
  full: 9999,
} as const;

export const typography = {
  /** Page hero title — Inter 48 / semibold (Events, etc.). */
  pageTitle: {
    fontFamily: fonts.sans.semibold,
    fontSize: 48,
    lineHeight: 56,
    // -3% tracking → fontSize * -0.03 (RN letterSpacing is in px)
    letterSpacing: 48 * -0.03,
  } satisfies TextStyle,
  h1: {
    fontFamily: fonts.sans.bold,
    fontSize: 30,
    lineHeight: 36,
  } satisfies TextStyle,
  h2: {
    fontFamily: fonts.sans.semibold,
    fontSize: 24,
    lineHeight: 30,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  bodySm: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,
  /** Compact UI labels; system/SF Pro when `fonts.ui` is unset. */
  label: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: -0.08,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,
} as const;

export type ShadowToken = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

/** RN shadow tokens. `nav` matches the Figma floating bottom bar. */
export const shadows = {
  nav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 7.1,
    elevation: 6,
  } satisfies ShadowToken,
  fab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 7.1,
    elevation: 6,
  } satisfies ShadowToken,
  /** Soft lift for fanned event memory photos. */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ShadowToken,
} as const;

export const sizes = {
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  touchTarget: 44,
  fab: 52,
  /** Create FAB plus mark size / stroke weight. */
  fabPlus: 16,
  fabPlusStroke: 2.5,
  navBarHeight: 52,
  /** Floating bottom nav inset from screen edges. */
  navPaddingX: 24,
} as const;

export const opacity = {
  disabled: 0.5,
} as const;

/** Motion tokens (matches design-spec `--duration-*` / transitions.dev). */
export const motion = {
  duration: {
    instant: 75,
    fast: 150,
    normal: 250,
    slow: 400,
  },
  /** cubic-bezier(0.22, 1, 0.36, 1) — tabs + panel reveal */
  easeTab: [0.22, 1, 0.36, 1] as const,
  /**
   * transitions.dev Panel reveal — translateY + opacity (+ blur on web).
   * Travel = panelHeight * translateYRatio so a short move still reads as full open/close.
   */
  modal: {
    openDur: 400,
    closeDur: 350,
    translateYRatio: 0.5,
    /** Approximate create-action panel height before / without layout (Figma ~187). */
    panelHeight: 187,
    /** CSS filter blur amount; not applied on native RN views. */
    blur: 2,
  },
  /**
   * transitions.dev Toast open / close — rise + fade + scale (+ blur on web).
   */
  toast: {
    openDur: 350,
    closeDur: 250,
    distance: 16,
    scale: 0.97,
    blur: 2,
    autoHideMs: 3200,
  },
} as const;

/** Success snackbar geometry from Figma `22:3938`. */
export const snackbar = {
  paddingX: 16,
  paddingY: 12,
  gap: 10,
  iconSize: 24,
  radius: 4,
} as const;

/** Create-action alert geometry from Figma Alert `11:2077`. */
export const createActionModal = {
  width: 300,
  padding: 14,
  /** Outer 14 + title-frame inset 8 */
  titlePaddingTop: 22,
  /** From title text bottom to buttons frame */
  titleToActions: 34,
  actionGap: 10,
  actionHeight: 48,
} as const;

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  sizes: typeof sizes;
  opacity: typeof opacity;
  motion: typeof motion;
  createActionModal: typeof createActionModal;
  snackbar: typeof snackbar;
};

export function createTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: createColors(scheme),
    fonts,
    spacing,
    radius,
    typography,
    shadows,
    sizes,
    opacity,
    motion,
    createActionModal,
    snackbar,
  };
}
