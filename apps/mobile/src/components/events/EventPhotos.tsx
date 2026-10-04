import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadState } from '@/components/ui/LoadState';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useFocusedData } from '@/hooks/useFocusedData';
import { deleteEventPhoto, listEventPhotos, uploadEventPhoto } from '@/lib/photos';
import { useTheme, type Theme } from '@/theme';
import type { EventPhoto } from '@/types';

const COLUMNS = 3;

// Below 1, the picker re-encodes as JPEG, which also converts iOS HEIC photos and keeps uploads small.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  allowsMultipleSelection: true,
  selectionLimit: 10,
};

type Props = {
  eventId: string;
  hostId: string;
  /** The signed-in user; they can delete their own photos, and the host can delete any. */
  userId?: string;
  /** Increment to open the library picker from outside (e.g. event header +). */
  pickRequest?: number;
};

/** Photo grid for an event. */
export function EventPhotos({ eventId, hostId, userId, pickRequest = 0 }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const loader = useCallback(() => listEventPhotos(eventId), [eventId]);
  const { data: photos, loading, error, busyIds, run, reload, retry } = useFocusedData(
    loader,
    'Could not load photos.',
  );
  const [gridWidth, setGridWidth] = useState(0);
  const [viewing, setViewing] = useState<EventPhoto | null>(null);
  const lastPickRequest = useRef(0);

  const canDelete = (photo: EventPhoto) =>
    userId !== undefined && (userId === photo.author_id || userId === hostId);

  const addPhotos = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;
    let failed = 0;
    let lastError = '';
    for (const asset of result.assets) {
      try {
        await uploadEventPhoto(eventId, asset);
      } catch (err) {
        failed += 1;
        lastError = err instanceof Error ? err.message : 'Please try again.';
      }
    }
    await reload();
    if (failed) {
      const what = failed === result.assets.length ? 'Your photos' : `${failed} of ${result.assets.length} photos`;
      Alert.alert(`${what} could not be added`, lastError);
    }
  }, [eventId, reload]);

  useEffect(() => {
    if (pickRequest > 0 && pickRequest !== lastPickRequest.current) {
      lastPickRequest.current = pickRequest;
      void addPhotos();
    }
  }, [pickRequest, addPhotos]);

  function confirmDelete(photo: EventPhoto) {
    if (!canDelete(photo)) return;
    Alert.alert('Delete photo?', 'This removes it from the event for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const id = photo.id;
          setViewing(null);
          run(id, () => deleteEventPhoto(eventId, id), 'Could not delete photo');
        },
      },
    ]);
  }

  const gap = theme.spacing[1];
  const tileSize = gridWidth ? (gridWidth - gap * (COLUMNS - 1)) / COLUMNS : 0;
  const deleting = viewing ? busyIds.has(viewing.id) : false;
  const viewingDeletable = viewing ? canDelete(viewing) : false;

  return (
    <View style={styles.section}>
      {!photos ? (
        <LoadState loading={loading} error={error} fallbackError="Could not load photos." onRetry={retry} />
      ) : photos.length === 0 ? (
        <Text style={styles.empty}>No photos yet.</Text>
      ) : (
        <View style={[styles.grid, { gap }]} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {tileSize > 0 &&
            photos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => setViewing(photo)}
                onLongPress={canDelete(photo) ? () => confirmDelete(photo) : undefined}
                disabled={busyIds.has(photo.id)}
                accessibilityRole="imagebutton"
                accessibilityLabel="Open photo"
                accessibilityHint={canDelete(photo) ? 'Long press to delete' : undefined}
                style={({ pressed }) => [
                  busyIds.has(photo.id) && styles.tileBusy,
                  pressed && styles.tilePressed,
                ]}
              >
                <Image source={{ uri: photo.url }} style={[styles.tile, { width: tileSize, height: tileSize }]} />
              </Pressable>
            ))}
        </View>
      )}

      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setViewing(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          />
          {viewing ? (
            <Image source={{ uri: viewing.url }} style={styles.full} resizeMode="contain" pointerEvents="none" />
          ) : null}
          {viewingDeletable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
              accessibilityState={{ disabled: deleting }}
              disabled={deleting}
              hitSlop={theme.spacing[2]}
              onPress={() => viewing && confirmDelete(viewing)}
              style={({ pressed }) => [
                styles.deleteButton,
                { top: insets.top + theme.spacing[3], right: theme.sizes.pagePaddingX },
                pressed && !deleting && styles.deleteButtonPressed,
                deleting && styles.deleteButtonDisabled,
              ]}
            >
              <SFSymbolIcon name="trash" size={theme.sizes.iconMd} color={theme.colors.onDanger} />
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[4],
    },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tile: {
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    tilePressed: {
      opacity: 0.85,
    },
    tileBusy: {
      opacity: theme.opacity.disabled,
    },
    viewer: {
      flex: 1,
      backgroundColor: theme.colors.photoViewer,
      justifyContent: 'center',
    },
    full: {
      width: '100%',
      height: '100%',
    },
    deleteButton: {
      position: 'absolute',
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.danger,
      ...theme.shadows.fab,
    },
    deleteButtonPressed: {
      backgroundColor: theme.colors.dangerActive,
    },
    deleteButtonDisabled: {
      opacity: theme.opacity.disabled,
    },
  });
}
