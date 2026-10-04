import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  accessibilityLabel: string;
  children: React.ReactNode;
};

/**
 * Circular icon control from Figma Large “Bordered - Prominent”
 * (header history/plus + bottom search) — secondary fill + nav shadow.
 */
export function CircleIconButton({
  accessibilityLabel,
  children,
  disabled,
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
        pressed && styles.pressed,
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
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
  });
}
