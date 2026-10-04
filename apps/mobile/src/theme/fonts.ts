/**
 * Loaded font family names (expo-google-fonts).
 * UI chrome (tabs, controls) can use `ui` — SF Pro on iOS, Roboto on Android.
 */
export const fonts = {
  sans: {
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  display: {
    regular: 'Rubik_400Regular',
    medium: 'Rubik_500Medium',
    semibold: 'Rubik_600SemiBold',
    bold: 'Rubik_700Bold',
  },
  /** System UI font (SF Pro on Apple platforms). */
  ui: undefined,
} as const;
