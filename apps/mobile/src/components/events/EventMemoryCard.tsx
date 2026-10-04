import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { useScrollRevealEnter } from '@/hooks/useScrollReveal';
import { formatEventDate } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';
import type { EventHomeItem } from '@/types';

type Props = {
  event: EventHomeItem;
  onPress: () => void;
  /** When true, stay hidden until scrolled into view. First card should leave this off. */
  revealOnScroll?: boolean;
};

type PhotoSlot = {
  key: string;
  wrap: object;
  angle: number;
  photo: EventHomeItem['preview_photos'][number] | undefined;
};

/**
 * Event memory preview card from Figma Group 2 (`22:3202`):
 * fanned photo stack, title, date • memories, avatar row.
 * Entrance plays once per mount (first view / reload), not on tab re-focus.
 */
export function EventMemoryCard({
  event,
  onPress,
  revealOnScroll = false,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const date = formatEventDate(event.starts_at ?? event.created_at);
  const memoryCount = event.photo_count;
  const memoriesLabel =
    memoryCount === 1 ? '1 Memory' : `${memoryCount} Memories`;
  const photos = event.preview_photos.slice(0, 3);
  // Fan order: back-right, back-left, front — front gets the first (latest) photo.
  const slots: PhotoSlot[] = [
    { key: 'backRight', wrap: styles.photoBackRight, angle: 4, photo: photos[2] },
    { key: 'backLeft', wrap: styles.photoBackLeft, angle: -12, photo: photos[1] },
    { key: 'front', wrap: styles.photoFront, angle: 8, photo: photos[0] },
  ];
  const label = `${event.title}, ${date}, ${memoriesLabel}`;

  const rootRef = useRef<View>(null);
  const chrome = useRef(new Animated.Value(0)).current;
  const photoAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const played = useRef(false);
  const [settled, setSettled] = useState(false);
  const [started, setStarted] = useState(!revealOnScroll);
  const { cardEntrance, easeTab } = theme.motion;

  const playEntrance = useCallback(() => {
    if (played.current) return;
    played.current = true;
    const chromeEase = Easing.bezier(...easeTab);
    const photoEase = Easing.bezier(...cardEntrance.photoEase);
    setStarted(true);
    setSettled(false);
    chrome.setValue(0);
    photoAnims.forEach((anim) => anim.setValue(0));

    Animated.parallel([
      Animated.timing(chrome, {
        toValue: 1,
        duration: cardEntrance.duration,
        delay: cardEntrance.photoStagger,
        easing: chromeEase,
        useNativeDriver: true,
      }),
      // One photo scales in, then the next, then the next — back → front.
      Animated.stagger(
        cardEntrance.photoStagger,
        photoAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: cardEntrance.photoDuration,
            easing: photoEase,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start(({ finished }) => {
      if (finished) setSettled(true);
    });
  }, [chrome, photoAnims, cardEntrance, easeTab]);

  useEffect(() => {
    if (!revealOnScroll) playEntrance();
  }, [revealOnScroll, playEntrance]);

  const { onLayout } = useScrollRevealEnter(rootRef, playEntrance, revealOnScroll);

  return (
    <View
      ref={rootRef}
      collapsable={false}
      onLayout={onLayout}
      // Later cards keep layout height but stay invisible until scrolled into view.
      style={!started ? styles.pending : undefined}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens event"
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        <View style={styles.stack}>
          {slots.map((slot, index) => {
            const anim = photoAnims[index];
            return (
              <View key={slot.key} style={[styles.photoWrap, slot.wrap]}>
                <Animated.View
                  style={[
                    styles.photo,
                    settled
                      ? { transform: [{ rotate: `${slot.angle}deg` }] }
                      : {
                          // Fade most of the way early so scale can ease without a hard pop.
                          opacity: anim.interpolate({
                            inputRange: [0, 0.55, 1],
                            outputRange: [0, 1, 1],
                          }),
                          transform: [
                            {
                              scale: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [cardEntrance.photoScale, 1],
                              }),
                            },
                            // Start near the final tilt so rotation doesn’t add snap.
                            {
                              rotate: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [`${slot.angle * 0.65}deg`, `${slot.angle}deg`],
                              }),
                            },
                          ],
                        },
                  ]}
                >
                  {slot.photo ? (
                    <Image source={{ uri: slot.photo.url }} style={styles.photoImage} />
                  ) : null}
                </Animated.View>
              </View>
            );
          })}
        </View>

        <Animated.View
          style={[
            styles.chrome,
            settled
              ? undefined
              : {
                  opacity: chrome,
                  transform: [
                    {
                      translateY: chrome.interpolate({
                        inputRange: [0, 1],
                        outputRange: [cardEntrance.distance, 0],
                      }),
                    },
                  ],
                },
          ]}
        >
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
        </Animated.View>
      </Pressable>
    </View>
  );
}

function createStyles(theme: Theme) {
  const photoFill = theme.colors.bgSurfaceAlt;
  const photoBorder = theme.colors.bgSurface;

  // Fan bounding box from Figma (~0 → 361). Center that box on the page.
  const fanWidth = 361;

  return StyleSheet.create({
    pending: {
      opacity: 0,
    },
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
    chrome: {
      alignItems: 'center',
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
