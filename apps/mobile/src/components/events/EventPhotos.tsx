import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
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
};

/** Photo grid for an event, with a button to add photos from the library. */
export function EventPhotos({ eventId, hostId, userId }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const loader = useCallback(() => listEventPhotos(eventId), [eventId]);
  const { data: photos, loading, error, reload, retry, busyIds, run } = useFocusedData(loader, 'Could not load photos.');
  const [uploading, setUploading] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  const [viewing, setViewing] = useState<EventPhoto | null>(null);

  async function addPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;
    setUploading(true);
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
    setUploading(false);
    if (failed) {
      const what = failed === result.assets.length ? 'Your photos' : `${failed} of ${result.assets.length} photos`;
      Alert.alert(`${what} could not be added`, lastError);
    }
  }

  const canDelete = (photo: EventPhoto) => userId !== undefined && (userId === photo.author_id || userId === hostId);

  function confirmDelete(photo: EventPhoto) {
    Alert.alert('Delete photo?', 'It will be removed from the event for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void run(photo.id, () => deleteEventPhoto(eventId, photo.id), 'Could not delete photo'),
      },
    ]);
  }

  const gap = theme.spacing[1];
  const tileSize = gridWidth ? (gridWidth - gap * (COLUMNS - 1)) / COLUMNS : 0;

  return (
    <View style={styles.section}>
      <ListGroup title="Photos" count={photos?.length} emptyText="No photos yet. Add the first one.">
        {photos ? (
          <View style={[styles.grid, { gap }]} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {tileSize > 0 &&
              photos.map((photo) => (
                <View key={photo.id} style={busyIds.has(photo.id) && styles.busy}>
                  <Pressable
                    onPress={() => setViewing(photo)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Open photo"
                  >
                    <Image source={{ uri: photo.url }} style={[styles.tile, { width: tileSize, height: tileSize }]} />
                  </Pressable>
                  {canDelete(photo) ? (
                    <Pressable
                      onPress={() => confirmDelete(photo)}
                      disabled={busyIds.has(photo.id)}
                      hitSlop={theme.spacing[2]}
                      accessibilityRole="button"
                      accessibilityLabel="Delete photo"
                      style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                    >
                      <SFSymbolIcon name="xmark" size={12} color="#fff" />
                    </Pressable>
                  ) : null}
                </View>
              ))}
          </View>
        ) : (
          <LoadState loading={loading} error={error} fallbackError="Could not load photos." onRetry={retry} />
        )}
      </ListGroup>

      <Button label="Add photos" variant="secondary" loading={uploading} onPress={addPhotos} />

      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)} accessibilityLabel="Close photo">
          {viewing ? <Image source={{ uri: viewing.url }} style={styles.full} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[3],
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tile: {
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    busy: {
      opacity: theme.opacity.disabled,
    },
    remove: {
      position: 'absolute',
      top: theme.spacing[1],
      right: theme.spacing[1],
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    removePressed: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    viewer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
    },
    full: {
      width: '100%',
      height: '100%',
    },
  });
}
