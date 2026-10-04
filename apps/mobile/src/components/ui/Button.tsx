import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type Shape = 'default' | 'pill';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** `pill` matches the rounded drawer / create-action CTAs. */
  shape?: Shape;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Defaults to `label`; set when the label alone is ambiguous (e.g. "Accept" in a list). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Design-spec button (section 6.1). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  shape = 'default',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const height = controlHeight(theme, size);
  const slop = Math.max(0, (theme.sizes.touchTarget - height) / 2);
  const pill = shape === 'pill';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={{ top: slop, bottom: slop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pill && styles.pill,
        pressed && styles[`${variant}Pressed`],
        fullWidth && styles.fullWidth,
        focused && styles.focused,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor(theme, variant)} />
      ) : (
        <Text
          style={[
            pill ? styles.labelCta : size === 'lg' ? styles.labelLg : styles.label,
            { color: labelColor(theme, variant) },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function controlHeight(theme: Theme, size: Size) {
  if (size === 'sm') return theme.sizes.controlSm;
  if (size === 'lg') return theme.sizes.controlLg;
  return theme.sizes.controlMd;
}

function labelColor(theme: Theme, variant: Variant) {
  if (variant === 'primary') return theme.colors.onAccent;
  if (variant === 'danger') return theme.colors.onDanger;
  if (variant === 'outline') return theme.colors.accentStrong;
  return theme.colors.textPrimary;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
      borderRadius: theme.radius.md,
      borderWidth: theme.sizes.borderWidth,
      borderColor: 'transparent',
    },
    pill: {
      borderRadius: theme.radius.full,
      height: theme.createActionModal.actionHeight,
      minHeight: theme.createActionModal.actionHeight,
      paddingHorizontal: theme.spacing[4],
    },
    sm: { minHeight: theme.sizes.controlSm, paddingHorizontal: theme.spacing[3] },
    md: { minHeight: theme.sizes.controlMd, paddingHorizontal: theme.spacing[4] },
    lg: { minHeight: theme.sizes.controlLg, paddingHorizontal: theme.spacing[6] },
    primary: { backgroundColor: theme.colors.accent },
    primaryPressed: { backgroundColor: theme.colors.accentActive },
    secondary: { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.borderDefault },
    secondaryPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderColor: theme.colors.borderStrong,
    },
    outline: {
      backgroundColor: theme.colors.bgSurface,
      borderColor: theme.colors.accentStrong,
    },
    outlinePressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    ghost: { backgroundColor: 'transparent' },
    ghostPressed: { backgroundColor: theme.colors.bgSurfaceAlt },
    danger: { backgroundColor: theme.colors.danger },
    dangerPressed: { backgroundColor: theme.colors.dangerActive },
    fullWidth: { alignSelf: 'stretch' },
    focused: { borderColor: theme.colors.borderFocus },
    disabled: { opacity: theme.opacity.disabled },
    label: { ...theme.typography.button },
    labelLg: { ...theme.typography.buttonLg },
    labelCta: { ...theme.typography.buttonCta, textAlign: 'center' },
  });
}
