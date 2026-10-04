import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { formatEventDate } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';
import type { EventHomeItem } from '@/types';

type Props = {
  event: EventHomeItem;
  onPress: () => void;
};

/**
 * Event memory preview card from Figma Group 2 (`22:3202`):
 * fanned photo stack, title, date • memories, avatar row.
 */
export function EventMemoryCard({ event, onPress }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const date = formatEventDate(event.starts_at ?? event.created_at);
  const memoryCount = event.photo_count;
  const memoriesLabel =
    memoryCount === 1 ? '1 Memory' : `${memoryCount} Memories`;
  const photos = event.preview_photos.slice(0, 3);
  // Fan order: back-right, back-left, front — front gets the first (fav/latest) photo.
  const slots = [
    { key: 'backRight', wrap: styles.photoBackRight, tilt: styles.photoTiltRight, photo: photos[2] },
    { key: 'backLeft', wrap: styles.photoBackLeft, tilt: styles.photoTiltLeft, photo: photos[1] },
    { key: 'front', wrap: styles.photoFront, tilt: styles.photoTiltFront, photo: photos[0] },
  ] as const;
  const label = `${event.title}, ${date}, ${memoriesLabel}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens event"
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.stack}>
        {slots.map((slot) => (
          <View key={slot.key} style={[styles.photoWrap, slot.wrap]}>
            <View style={[styles.photo, slot.tilt]}>
              {slot.photo ? (
                <Image source={{ uri: slot.photo.url }} style={styles.photoImage} />
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.meta}>
        <Text style={styles.metaText}>{date}</Text>
        <View style={styles.dot} />
        <Text style={styles.metaText}>{memoriesLabel}</Text>
      </View>

      <AvatarStack
        size="sm"
        align="center"
        people={event.members.map((member) => ({
          id: member.id,
          name: member.username ?? '?',
          color: member.avatar_color,
        }))}
        onPress={onPress}
        accessibilityLabel={`${event.members.length} members`}
        accessibilityHint="Opens event"
      />
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  const photoFill = theme.colors.bgSurfaceAlt;
  const photoBorder = theme.colors.bgSurface;

  // Fan bounding box from Figma (~0 → 361). Center that box on the page.
  const fanWidth = 361;

  return StyleSheet.create({
    root: {
      width: '100%',
      alignItems: 'center',
    },
    pressed: {
      opacity: 0.9,
    },
    stack: {
      width: fanWidth,
      height: 360,
      marginBottom: theme.spacing[6],
      alignSelf: 'center',
    },
    photoWrap: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Positions from Figma Group 2 metadata (relative to group origin).
    photoBackLeft: {
      left: -5,
      top: 10,
      width: 244,
      height: 299,
      zIndex: 1,
    },
    photoBackRight: {
      left: 145,
      top: 50,
      width: 205,
      height: 273,
      zIndex: 0,
    },
    photoFront: {
      left: 65,
      top: 92,
      width: 227,
      height: 288,
      zIndex: 2,
    },
    photo: {
      width: 196,
      height: 266,
      borderRadius: 32,
      borderWidth: 4,
      borderColor: photoBorder,
      backgroundColor: photoFill,
      overflow: 'hidden',
      ...theme.shadows.card,
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    photoTiltLeft: {
      transform: [{ rotate: '-12deg' }],
    },
    photoTiltRight: {
      transform: [{ rotate: '4deg' }],
    },
    photoTiltFront: {
      transform: [{ rotate: '8deg' }],
    },
    title: {
      fontFamily: theme.fonts.display.medium,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: 32 * -0.03,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginTop: theme.spacing[6],
      marginBottom: theme.spacing[1],
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      marginBottom: theme.spacing[5],
    },
    metaText: {
      fontFamily: theme.fonts.sans.light,
      fontSize: 16,
      lineHeight: 19,
      letterSpacing: 16 * -0.02,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.textPrimary,
    },
  });
}
