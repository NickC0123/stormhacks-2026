import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Variant = 'default' | 'accent';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  accessibilityLabel: string;
  children: React.ReactNode;
  /** `accent` = teal create FAB (onAccent icon). */
  variant?: Variant;
};

/**
 * Circular icon control from Figma Large “Bordered - Prominent”
 * (header history/plus + bottom search) — secondary fill + nav shadow.
 * `accent` matches the floating create FAB.
 */
export function CircleIconButton({
  accessibilityLabel,
  children,
  disabled,
  variant = 'default',
  ...rest
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'accent' && styles.accent,
        pressed && (variant === 'accent' ? styles.accentPressed : styles.pressed),
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      width: theme.sizes.fab,
      height: theme.sizes.fab,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.navBar,
      ...theme.shadows.fab,
    },
    accent: {
      backgroundColor: theme.colors.accent,
    },
    pressed: {
      opacity: 0.85,
    },
    accentPressed: {
      backgroundColor: theme.colors.accentActive,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
  });
}
