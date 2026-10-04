import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/** Tappable event row that opens the event page. */
export function EventRow({ title, subtitle, onPress }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint="Opens the event"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, focused && styles.focused]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      minHeight: theme.sizes.touchTarget,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[2],
      borderRadius: theme.radius.md,
      borderWidth: theme.sizes.borderWidth,
      borderColor: 'transparent',
    },
    pressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    focused: {
      borderColor: theme.colors.borderFocus,
    },
    text: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    chevron: {
      ...theme.typography.h4,
      color: theme.colors.textTertiary,
    },
  });
}
