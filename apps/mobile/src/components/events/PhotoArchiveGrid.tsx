import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { StoryPosition } from '@/components/events/StoryViewer';
import type { EventStory } from '@/hooks/useEventStories';
import { archiveDate } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';
import type { EventPhoto } from '@/types';

type Tile = { photo: EventPhoto; eventTitle: string; position: StoryPosition };

type Props = {
  stories: EventStory[];
  onOpen: (position: StoryPosition) => void;
  bottomInset?: number;
};

/** Every event photo, newest first, each tile stamped with the day it was added. */
export function PhotoArchiveGrid({ stories, onOpen, bottomInset = 0 }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { width } = useWindowDimensions();
  const columns = width >= theme.sizes.archiveWideBreakpoint ? theme.sizes.archiveColumnsWide : theme.sizes.archiveColumns;
  const gap = theme.spacing[0.5];
  const tileWidth = (width - gap * (columns - 1)) / columns;

  const tiles: Tile[] = stories
    .flatMap((story, storyIndex) => story.photos.map((photo, photoIndex) => ({
      photo,
      eventTitle: story.event.title,
      position: { story: storyIndex, photo: photoIndex },
    })))
    .sort((a, b) => new Date(b.photo.created_at).getTime() - new Date(a.photo.created_at).getTime());

  return (
    <FlatList
      key={columns}
      data={tiles}
      numColumns={columns}
      keyExtractor={(tile) => tile.photo.id}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      contentContainerStyle={{ gap, paddingBottom: bottomInset }}
      renderItem={({ item }) => (
        <ArchiveTile tile={item} width={tileWidth} styles={styles} onPress={() => onOpen(item.position)} />
      )}
    />
  );
}

function ArchiveTile({ tile, width, styles, onPress }: {
  tile: Tile;
  width: number;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const date = archiveDate(tile.photo.created_at);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={`Photo from ${tile.eventTitle}, ${date.full}`}
      accessibilityHint="Opens the photo"
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed, focused && styles.focused]}
    >
      <Image source={{ uri: tile.photo.url }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.day}>{date.day}</Text>
        <Text style={styles.month}>{date.month}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    tile: {
      aspectRatio: theme.sizes.archiveTileAspectRatio,
      backgroundColor: theme.colors.bgSurfaceAlt,
      overflow: 'hidden',
      borderWidth: theme.sizes.borderWidth,
      borderColor: 'transparent',
    },
    pressed: {
      opacity: theme.opacity.disabled,
    },
    focused: {
      borderColor: theme.colors.borderFocus,
    },
    image: {
      ...StyleSheet.absoluteFill,
    },
    badge: {
      position: 'absolute',
      top: theme.spacing[1.5],
      left: theme.spacing[1.5],
      alignItems: 'center',
      paddingHorizontal: theme.spacing[1.5],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgSurface,
      ...theme.shadows.card,
    },
    day: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    month: {
      ...theme.typography.caption,
      color: theme.colors.textPrimary,
    },
  });
}
