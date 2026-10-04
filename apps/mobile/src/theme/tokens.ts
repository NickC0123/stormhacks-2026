import type { TextStyle, ViewStyle } from 'react-native';

import { fonts } from '@/theme/fonts';
import type { AvatarColor, ItemCategory } from '@/types';

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
  /** Spending chart category hues: 600-ish for light surfaces, 400-ish for dark. */
  green600: '#16a34a',
  green400: '#4ade80',
  orange600: '#ea580c',
  orange400: '#fb923c',
  blue600: '#2563eb',
  blue400: '#60a5fa',
  pink600: '#db2777',
  pink400: '#f472b6',
  violet600: '#7c3aed',
  violet400: '#a78bfa',
  amber600: '#d97706',
  amber400: '#fbbf24',
  cyan700: '#0e7490',
  cyan400: '#22d3ee',
  indigo500: '#6366f1',
  indigo300: '#a5b4fc',
  lime700: '#4d7c0f',
  lime400: '#a3e635',
  fuchsia600: '#c026d3',
  fuchsia400: '#e879f9',
  stone500: '#78716c',
  stone400: '#a8a29e',
  iosGray6: '#f2f2f7',
  iosGray6Dark: '#1c1c1e',
  /** iOS system accents (light). */
  iosBlue: '#007AFF',
  iosPurple: '#AF52DE',
  iosPink: '#FF2D55',
  iosRed: '#FF3B30',
  iosOrange: '#FF9500',
  iosYellow: '#FFCC00',
  iosGreen: '#34C759',
  iosMint: '#00C7BE',
  iosTeal: '#30B0C7',
  iosCyan: '#32ADE6',
  iosIndigo: '#5856D6',
  iosBrown: '#A2845E',
  /** iOS system accents (dark). */
  iosBlueDark: '#0A84FF',
  iosPurpleDark: '#BF5AF2',
  iosPinkDark: '#FF375F',
  iosRedDark: '#FF453A',
  iosOrangeDark: '#FF9F0A',
  iosYellowDark: '#FFD60A',
  iosGreenDark: '#30D158',
  iosMintDark: '#63E6BE',
  iosTealDark: '#40C8E0',
  iosCyanDark: '#64D2FF',
  iosIndigoDark: '#5E5CE6',
  iosBrownDark: '#AC8E68',
  glyphPrimary: '#595959',
} as const;

export type AvatarAccent = {
  bg: string;
  fg: string;
};

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
  textDisabled: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderFocus: string;
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
  /** Dimmed backdrop behind modals / sheets. */
  overlay: string;
  /** Full-screen photo lightbox background (always near-black). */
  photoViewer: string;
  /** Spending chart segment per expense category. Always pair with a text label. */
  chartCategory: Record<ItemCategory, string>;
  /** Per-user initials avatar fills keyed by iOS system accent name. */
  avatarAccent: Record<AvatarColor, AvatarAccent>;
};

function chartCategoryColors(scheme: ColorScheme): Record<ItemCategory, string> {
  const dark = scheme === 'dark';
  return {
    groceries: dark ? primitives.green400 : primitives.green600,
    food_drinks: dark ? primitives.orange400 : primitives.orange600,
    transportation: dark ? primitives.blue400 : primitives.blue600,
    shopping: dark ? primitives.pink400 : primitives.pink600,
    entertainment: dark ? primitives.violet400 : primitives.violet600,
    housing: dark ? primitives.amber400 : primitives.amber600,
    bills_utilities: dark ? primitives.cyan400 : primitives.cyan700,
    subscriptions: dark ? primitives.indigo300 : primitives.indigo500,
    health_fitness: dark ? primitives.red500 : primitives.red600,
    education: dark ? primitives.lime400 : primitives.lime700,
    personal_care: dark ? primitives.fuchsia400 : primitives.fuchsia600,
    work: dark ? primitives.gray400 : primitives.gray600,
    other: dark ? primitives.stone400 : primitives.stone500,
  };
}

/** Initials on iOS system fills — white, except yellow which needs dark label. */
function avatarAccentColors(scheme: ColorScheme): Record<AvatarColor, AvatarAccent> {
  const dark = scheme === 'dark';
  const onFill = primitives.gray0;
  const onYellow = dark ? primitives.gray950 : primitives.gray900;
  return {
    blue: { bg: dark ? primitives.iosBlueDark : primitives.iosBlue, fg: onFill },
    purple: { bg: dark ? primitives.iosPurpleDark : primitives.iosPurple, fg: onFill },
    pink: { bg: dark ? primitives.iosPinkDark : primitives.iosPink, fg: onFill },
    red: { bg: dark ? primitives.iosRedDark : primitives.iosRed, fg: onFill },
    orange: { bg: dark ? primitives.iosOrangeDark : primitives.iosOrange, fg: onFill },
    yellow: { bg: dark ? primitives.iosYellowDark : primitives.iosYellow, fg: onYellow },
    green: { bg: dark ? primitives.iosGreenDark : primitives.iosGreen, fg: onFill },
    mint: { bg: dark ? primitives.iosMintDark : primitives.iosMint, fg: onFill },
    teal: { bg: dark ? primitives.iosTealDark : primitives.iosTeal, fg: onFill },
    cyan: { bg: dark ? primitives.iosCyanDark : primitives.iosCyan, fg: onFill },
    indigo: { bg: dark ? primitives.iosIndigoDark : primitives.iosIndigo, fg: onFill },
    brown: { bg: dark ? primitives.iosBrownDark : primitives.iosBrown, fg: onFill },
  };
}

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
      textDisabled: primitives.gray600,
      borderSubtle: primitives.gray800,
      borderDefault: primitives.gray700,
      borderStrong: primitives.gray600,
      borderFocus: primitives.teal400,
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
      // Figma Miscellaneous/Alert - Overlay, darkened for night.
      overlay: 'rgba(0, 0, 0, 0.45)',
      photoViewer: primitives.gray950,
      chartCategory: chartCategoryColors(scheme),
      avatarAccent: avatarAccentColors(scheme),
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
    textDisabled: primitives.gray400,
    borderSubtle: primitives.gray200,
    borderDefault: primitives.gray300,
    borderStrong: primitives.gray400,
    borderFocus: primitives.teal700,
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
    // Figma Miscellaneous/Alert - Overlay ≈ #29293a @ 23%
    overlay: 'rgba(41, 41, 58, 0.23)',
    photoViewer: primitives.gray950,
    chartCategory: chartCategoryColors(scheme),
    avatarAccent: avatarAccentColors(scheme),
  };
}

/** 4pt spacing scale (matches design-spec `--space-*`). */
export const spacing = {
  0: 0,
  0.5: 2,
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
  /** Page hero title — Inter 32 / semibold, centered (Events, Figma `27:4262`). */
  pageTitle: {
    fontFamily: fonts.sans.semibold,
    fontSize: 32,
    lineHeight: 38,
    // -3% tracking → fontSize * -0.03 (RN letterSpacing is in px)
    letterSpacing: 32 * -0.03,
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
  /** Section / card title. */
  h4: {
    fontFamily: fonts.sans.semibold,
    fontSize: 20,
    lineHeight: 26,
  } satisfies TextStyle,
  /** Button labels for sm/md controls. */
  button: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,
  buttonLg: {
    fontFamily: fonts.sans.medium,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  /** Emphasized body text, e.g. list row titles. */
  bodyStrong: {
    fontFamily: fonts.sans.semibold,
    fontSize: 16,
    lineHeight: 24,
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
  /** Overflow count on avatar stacks (Figma event members +N). */
  captionStrong: {
    fontFamily: fonts.sans.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
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
  /** Dropdown / popover menus (design-spec `--shadow-lg`). */
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  } satisfies ShadowToken,
} as const;

export const sizes = {
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  touchTarget: 44,
  controlSm: 32,
  controlMd: 40,
  controlLg: 48,
  avatarMd: 40,
  /** Overlapping member stack on event detail (Figma 38:280, enlarged for touch). */
  avatarStack: 48,
  avatarStackOverlap: 12,
  avatarStackRing: 3,
  /** Max faces before the +N overflow chip. */
  avatarStackMax: 3,
  borderWidth: 1,
  /** Underline thickness for selected in-content tabs (design-spec 6.10). */
  tabIndicator: 2,
  /** Circular icon buttons (header + search) — Figma Large Bordered Prominent = 50. */
  fab: 50,
  /** Plus / search mark size / stroke weight inside circle buttons. */
  fabPlus: 16,
  fabPlusStroke: 2.5,
  fabIcon: 22,
  navBarHeight: 52,
  /** Floating bottom nav inset from screen edges. */
  navPaddingX: 24,
  /** Horizontal inset for pages and full-height drawers/panels. */
  pagePaddingX: 24,
  /** Bottom content fade height (Figma Events scrim ~130). */
  bottomFade: 130,
  /** Donut chart outer diameter and ring thickness. */
  donut: 168,
  donutStroke: 24,
  /** Space between donut segments. */
  donutGap: 2,
  /** Legend color swatch. */
  swatch: 12,
  /** Native iOS date/time spinner wheel height. */
  dateTimePicker: 216,
  /** Thin step progress track under drawer titles. */
  progressBar: 4,
  /** Receipt upload empty-state height (Figma Add Expense step 2). */
  receiptDropzone: 290,
  /** Receipt preview height after a photo is selected. */
  receiptDropzonePreview: 340,
  /** Upload glyph inside the receipt dropzone. */
  dropzoneIcon: 38,
  /** Max width for empty-state receipt caption copy. */
  dropzoneCaptionMax: 240,
  /** Hug-content “Add Receipt” CTA on the empty items state. */
  dropzoneAddReceiptMin: 168,
  /** Select / dropdown menu — ~4 options tall so the list scrolls. */
  dropdownMaxHeight: 176,
  dropdownMinWidth: 192,
} as const;

export const opacity = {
  disabled: 0.5,
  /** Peak opacity for the Events bottom content fade. */
  bottomFade: 0.55,
  /** Skeleton shimmer opacity range (spec §6.17). */
  skeletonMin: 0.45,
  skeletonMax: 1,
} as const;

/** Motion tokens (matches design-spec `--duration-*` / transitions.dev). */
export const motion = {
  duration: {
    instant: 75,
    fast: 150,
    normal: 250,
    slow: 400,
    /** One-way skeleton shimmer pulse. */
    skeleton: 900,
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
