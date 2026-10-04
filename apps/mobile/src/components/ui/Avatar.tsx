import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import type { AvatarColor } from '@/types';
import { AVATAR_COLORS } from '@/types';

type Props = {
  /** Used for the fallback initial. */
  name: string;
  /** iOS system accent assigned to the account. Defaults to blue. */
  color?: AvatarColor | null;
};

function resolveColor(color: AvatarColor | null | undefined): AvatarColor {
  if (color && (AVATAR_COLORS as readonly string[]).includes(color)) return color;
  return 'blue';
}

/** Initials avatar (design-spec section 6.14). Decorative; label the surrounding row instead. */
export function Avatar({ name, color }: Props) {
  const theme = useTheme();
  const accent = theme.colors.avatarAccent[resolveColor(color)];
  const styles = createStyles(theme, accent.bg, accent.fg);

  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function createStyles(theme: Theme, backgroundColor: string, color: string) {
  return StyleSheet.create({
    root: {
      width: theme.sizes.avatarMd,
      height: theme.sizes.avatarMd,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor,
    },
    initial: {
      ...theme.typography.bodyStrong,
      color,
    },
  });
}
