import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  /** Used for the fallback initial. */
  name: string;
};

/** Initials avatar (design-spec section 6.14). Decorative; label the surrounding row instead. */
export function Avatar({ name }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      width: theme.sizes.avatarMd,
      height: theme.sizes.avatarMd,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSubtle,
    },
    initial: {
      ...theme.typography.bodyStrong,
      color: theme.colors.accentStrong,
    },
  });
}
