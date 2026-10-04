import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

/** Fixed demo values — wire to real event data later. */
const TITLE = 'arcade hangout';
const DATE = 'Jul 5, 2026';
const MEMORIES_LABEL = '13 Memories';
const EXTRA_COUNT = '+5';

/**
 * Event memory preview card from Figma Group 2 (`22:3202`):
 * fanned photo stack, title, date • memories, avatar row.
 */
export function EventMemoryCard() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.root} accessibilityLabel={`${TITLE}, ${DATE}, ${MEMORIES_LABEL}`}>
      <View style={styles.stack}>
        <View style={[styles.photoWrap, styles.photoBackRight]}>
          <View style={[styles.photo, styles.photoTiltRight]} />
        </View>
        <View style={[styles.photoWrap, styles.photoBackLeft]}>
          <View style={[styles.photo, styles.photoTiltLeft]} />
        </View>
        <View style={[styles.photoWrap, styles.photoFront]}>
          <View style={[styles.photo, styles.photoTiltFront]} />
        </View>
      </View>

      <Text style={styles.title}>{TITLE}</Text>

      <View style={styles.meta}>
        <Text style={styles.metaText}>{DATE}</Text>
        <View style={styles.dot} />
        <Text style={styles.metaText}>{MEMORIES_LABEL}</Text>
      </View>

      <View style={styles.avatars}>
        <View style={[styles.avatar, styles.avatarOverlap]} />
        <View style={[styles.avatar, styles.avatarOverlap]} />
        <View style={[styles.avatar, styles.avatarOverlap]} />
        <View style={[styles.avatar, styles.avatarMore]}>
          <Text style={styles.avatarMoreLabel}>{EXTRA_COUNT}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  const photoFill = theme.colors.bgSurfaceAlt;
  const photoBorder = theme.colors.bgSurface;
  const avatarBorder = theme.colors.bgPage;

  // Fan bounding box from Figma (~0 → 361). Center that box on the page.
  const fanWidth = 361;

  return StyleSheet.create({
    root: {
      width: '100%',
      alignItems: 'center',
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
      ...theme.shadows.card,
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
    avatars: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      borderWidth: 3,
      borderColor: avatarBorder,
      backgroundColor: photoFill,
    },
    avatarOverlap: {
      marginRight: -8,
    },
    avatarMore: {
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 0,
    },
    avatarMoreLabel: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 12 * -0.02,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
}
