import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoArchiveGrid } from '@/components/events/PhotoArchiveGrid';
import { StoryViewer, type StoryPosition } from '@/components/events/StoryViewer';
import { Button } from '@/components/ui/Button';
import { useEventStories } from '@/hooks/useEventStories';
import { useTheme, type Theme } from '@/theme';

export default function ArchiveScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { stories, loading, error, retry } = useEventStories();
  const [open, setOpen] = useState<StoryPosition | null>(null);

  if (stories?.length) {
    return (
      <View style={styles.page}>
        <PhotoArchiveGrid stories={stories} onOpen={setOpen} bottomInset={insets.bottom} />
        <Modal
          visible={open !== null}
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => setOpen(null)}
        >
          {open ? (
            <StoryViewer
              stories={stories}
              initial={open}
              onClose={() => setOpen(null)}
              onOpenEvent={(eventId) => {
                setOpen(null);
                router.push(`/events/${eventId}`);
              }}
            />
          ) : null}
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.page, styles.center]}>
      {loading ? (
        <ActivityIndicator color={theme.colors.textTertiary} accessibilityLabel="Loading archive" />
      ) : (
        <>
          <Text style={styles.title} accessibilityRole="header">
            {error ? 'Couldn’t load your archive' : 'No photos yet'}
          </Text>
          <Text style={styles.message}>
            {error ?? 'Photos added to your events show up here by date.'}
          </Text>
          {error ? <Button label="Try again" onPress={retry} /> : null}
        </>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.bgPage,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[3],
      padding: theme.spacing[6],
    },
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
}
