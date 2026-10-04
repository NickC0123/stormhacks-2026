import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import type { EventStory } from '@/hooks/useEventStories';
import { displayName, timeAgo } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';

export type StoryPosition = { story: number; photo: number };
type Position = StoryPosition;

type Props = {
  stories: EventStory[];
  /** Where playback starts; defaults to the first photo of the first story. */
  initial?: Position;
  onClose: () => void;
  onOpenEvent: (eventId: string) => void;
};

/**
 * Full-screen viewer opened from the photo archive: each event is a story, each photo a segment.
 * Tap the right side for next, left for previous, hold to pause, swipe down to close.
 * Auto-advance is off while a screen reader is running.
 */
export function StoryViewer({ stories, initial, onClose, onOpenEvent }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState<Position>(initial ?? { story: 0, photo: 0 });
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));
  const elapsed = useRef(0);

  const story = stories[position.story];
  const photo = story.photos[position.photo];
  const loaded = loadedUrl === photo.url;
  const paused = held || dragging || screenReader;
  const author = story.members.find((member) => member.id === photo.author_id);
  const upcoming = story.photos[position.photo + 1] ?? stories[position.story + 1]?.photos[0];

  function go(next: Position) {
    progress.setValue(0);
    elapsed.current = 0;
    setPosition(next);
  }

  function next() {
    if (position.photo < story.photos.length - 1) go({ story: position.story, photo: position.photo + 1 });
    else if (position.story < stories.length - 1) go({ story: position.story + 1, photo: 0 });
    else onClose();
  }

  function previous() {
    if (position.photo > 0) go({ story: position.story, photo: position.photo - 1 });
    else go({ story: Math.max(0, position.story - 1), photo: 0 });
  }

  const advance = useEffectEvent(next);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (dismissed) close();
  }, [dismissed]);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!loaded || paused) return;
    const listener = progress.addListener(({ value }) => { elapsed.current = value; });
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.duration.storyPhoto * (1 - elapsed.current),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => { if (finished) advance(); });
    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [loaded, paused, position, progress, theme.motion.duration.storyPhoto]);

  useEffect(() => {
    if (upcoming) Image.prefetch(upcoming.url).catch(() => {});
  }, [upcoming]);

  const [panResponder] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > theme.spacing[3] && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => setDragging(true),
    onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > theme.sizes.storySwipeDismiss) { setDismissed(true); return; }
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      setDragging(false);
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      setDragging(false);
    },
  }));

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const byline = `${author ? displayName(author) : 'Event member'} · ${timeAgo(photo.created_at)}`;

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: dragY }] }]} {...panResponder.panHandlers}>
      <Image
        key={photo.url}
        source={{ uri: photo.url }}
        style={styles.photo}
        resizeMode="contain"
        onLoad={() => setLoadedUrl(photo.url)}
        onError={() => setLoadedUrl(photo.url)}
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={`Photo ${position.photo + 1} of ${story.photos.length} from ${story.event.title}, added by ${byline}`}
      />
      {!loaded ? <ActivityIndicator style={styles.spinner} color={theme.colors.onPhotoViewer} /> : null}

      <View style={styles.tapZones}>
        <Pressable
          style={styles.tapPrevious}
          onPress={previous}
          onLongPress={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          delayLongPress={theme.motion.duration.normal}
          accessibilityRole="button"
          accessibilityLabel="Previous photo"
        />
        <Pressable
          style={styles.tapNext}
          onPress={next}
          onLongPress={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          delayLongPress={theme.motion.duration.normal}
          accessibilityRole="button"
          accessibilityLabel="Next photo"
        />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + theme.spacing[2] }]} pointerEvents="box-none">
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {story.photos.map((item, index) => (
            <View key={item.id} style={styles.track}>
              <Animated.View
                style={[
                  styles.fill,
                  { width: index < position.photo ? '100%' : index === position.photo ? fillWidth : '0%' },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.meta}>
          <Pressable
            onPress={() => onOpenEvent(story.event.id)}
            accessibilityRole="button"
            accessibilityLabel={`${story.event.title}, ${byline}`}
            accessibilityHint="Opens the event"
            style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
          >
            <Avatar name={author?.username ?? story.event.title} color={author?.avatar_color} />
            <View style={styles.metaText}>
              <Text style={styles.title} numberOfLines={1}>{story.event.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{byline}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close stories"
            hitSlop={theme.spacing[2]}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <SFSymbolIcon name="xmark" color={theme.colors.onPhotoViewer} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.photoViewer,
    },
    photo: {
      ...StyleSheet.absoluteFill,
    },
    spinner: {
      ...StyleSheet.absoluteFill,
    },
    tapZones: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
    },
    tapPrevious: { flex: 1 },
    tapNext: { flex: 2 },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      gap: theme.spacing[3],
      paddingHorizontal: theme.spacing[3],
      paddingBottom: theme.spacing[3],
      backgroundColor: theme.colors.storyScrim,
    },
    bars: {
      flexDirection: 'row',
      gap: theme.spacing[1],
    },
    track: {
      flex: 1,
      height: theme.sizes.storyProgress,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.storyTrack,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.onPhotoViewer,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    identity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      minHeight: theme.sizes.touchTarget,
      borderRadius: theme.radius.md,
    },
    metaText: { flexShrink: 1 },
    title: {
      ...theme.typography.bodyStrong,
      color: theme.colors.onPhotoViewer,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.onPhotoViewer,
    },
    close: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
    },
    pressed: {
      opacity: theme.opacity.disabled,
    },
  });
}
