import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import type { AvatarColor } from '@/types';
import { AVATAR_COLORS } from '@/types';

type Size = 'md' | 'xl';

type Props = {
  /** Used for the fallback initial. */
  name: string;
  /** iOS system accent assigned to the account. Defaults to blue. */
  color?: AvatarColor | null;
  /** `md` for list rows, `xl` for profile headers. */
  size?: Size;
};

function resolveColor(color: AvatarColor | null | undefined): AvatarColor {
  if (color && (AVATAR_COLORS as readonly string[]).includes(color)) return color;
  return 'blue';
}

/** Initials avatar (design-spec section 6.14). Decorative; label the surrounding row instead. */
export function Avatar({ name, color, size = 'md' }: Props) {
  const theme = useTheme();
  const accent = theme.colors.avatarAccent[resolveColor(color)];
  const styles = createStyles(theme, accent.bg, accent.fg);

  return (
    <View style={[styles.root, styles[size]]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={size === 'xl' ? styles.initialXl : styles.initial}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function createStyles(theme: Theme, backgroundColor: string, color: string) {
  return StyleSheet.create({
    root: {
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor,
    },
    md: {
      width: theme.sizes.avatarMd,
      height: theme.sizes.avatarMd,
    },
    xl: {
      width: theme.sizes.avatarXl,
      height: theme.sizes.avatarXl,
    },
    initial: {
      ...theme.typography.bodyStrong,
      color,
    },
    initialXl: {
      ...theme.typography.h1,
      color,
    },
  });
}
