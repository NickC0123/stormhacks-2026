import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import type { AvatarColor } from '@/types';
import { AVATAR_COLORS } from '@/types';

export type AvatarStackPerson = {
  id: string;
  name: string;
  color?: AvatarColor | null;
};

type Props = {
  people: AvatarStackPerson[];
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** `sm` is used on the event detail header. Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Horizontal alignment of the facepile. Defaults to `start`. */
  align?: 'start' | 'center';
};

function resolveColor(color: AvatarColor | null | undefined): AvatarColor {
  if (color && (AVATAR_COLORS as readonly string[]).includes(color)) return color;
  return 'blue';
}

/**
 * Overlapping member faces + overflow chip (Figma event members 38:280).
 */
export function AvatarStack({
  people,
  onPress,
  accessibilityLabel,
  accessibilityHint = 'Opens manage people',
  size = 'md',
  align = 'start',
}: Props) {
  const theme = useTheme();
  const avatarSize = size === 'sm' ? theme.sizes.avatarStackSm : theme.sizes.avatarStack;
  const overlap = size === 'sm' ? theme.sizes.avatarStackSmOverlap : theme.sizes.avatarStackOverlap;
  const styles = createStyles(theme, avatarSize, overlap, align);
  const max = theme.sizes.avatarStackMax;
  const visible = people.slice(0, max);
  const overflow = Math.max(0, people.length - max);
  const label =
    accessibilityLabel ??
    (people.length === 1 ? '1 member' : `${people.length} members`);

  if (people.length === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {visible.map((person, index) => {
        const accent = theme.colors.avatarAccent[resolveColor(person.color)];
        return (
          <View
            key={person.id}
            style={[
              styles.avatar,
              index > 0 && styles.overlap,
              // Later faces stack above earlier ones (rightmost on top).
              { zIndex: index + 1, backgroundColor: accent.bg },
            ]}
          >
            <Text style={[styles.initial, { color: accent.fg }]}>
              {person.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        );
      })}
      {overflow > 0 ? (
        <View
          style={[
            styles.avatar,
            styles.overflow,
            styles.overlap,
            { zIndex: visible.length + 1 },
          ]}
        >
          <Text style={styles.overflowLabel}>+{overflow}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(
  theme: Theme,
  size: number,
  overlap: number,
  align: 'start' | 'center',
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: align === 'center' ? 'center' : 'flex-start',
    },
    pressed: {
      opacity: 0.85,
    },
    avatar: {
      width: size,
      height: size,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderWidth: theme.sizes.avatarStackRing,
      borderColor: theme.colors.bgPage,
    },
    overlap: {
      marginLeft: -overlap,
    },
    overflow: {
      backgroundColor: theme.colors.borderDefault,
    },
    initial: {
      ...(size <= theme.sizes.avatarStackSm ? theme.typography.caption : theme.typography.bodySm),
      fontFamily: theme.fonts.sans.medium,
      color: theme.colors.textPrimary,
    },
    overflowLabel: {
      ...(size <= theme.sizes.avatarStackSm ? theme.typography.caption : theme.typography.bodySm),
      fontFamily: theme.fonts.sans.medium,
      color: theme.colors.textPrimary,
    },
  });
}
