import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { EventActionModal } from '@/components/events/EventActionModal';
import { EventExpenses } from '@/components/events/EventExpenses';
import { EventPhotos } from '@/components/events/EventPhotos';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useSnackbar } from '@/components/ui/Snackbar';
import { Tabs } from '@/components/ui/Tabs';
import { useFocusedData } from '@/hooks/useFocusedData';
import { deleteEvent, formatEventDate, getEvent } from '@/lib/events';
import { useProfile } from '@/lib/profile';
import { useTheme, type Theme } from '@/theme';

type EventTab = 'photos' | 'expenses';

const EVENT_TABS: { value: EventTab; label: string }[] = [
  { value: 'photos', label: 'Photos' },
  { value: 'expenses', label: 'Expenses' },
];

function EventBackButton() {
  return (
    <CircleIconButton accessibilityLabel="Back" onPress={() => router.back()}>
      <SFSymbolIcon name="chevron.left" />
    </CircleIconButton>
  );
}

function openManagePeople(eventId: string) {
  router.push({ pathname: '/events/[eventId]/invite', params: { eventId } });
}

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { profile } = useProfile();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState<EventTab>('photos');
  const [createOpen, setCreateOpen] = useState(false);
  const [photoPickRequest, setPhotoPickRequest] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const loader = useCallback(() => getEvent(eventId), [eventId]);
  const { data: event, loading, refreshing, error, refresh, retry } = useFocusedData(
    loader,
    'Could not load this event.',
  );

  function confirmDelete() {
    if (!event) return;
    Alert.alert(
      'Delete event?',
      `“${event.title}” and all its expenses, photos and recorded payments will be deleted for everyone. This can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove() },
      ],
    );
  }

  async function remove() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteEvent(eventId);
      router.back();
      showSnackbar({ message: 'Event deleted.', variant: 'success' });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the event.');
      setDeleting(false);
    }
  }

  if (!event) {
    return (
      <Screen title="Event" headerLeft={<EventBackButton />}>
        <View style={styles.content}>
          <LoadState loading={loading} error={error} fallbackError="Could not load this event." onRetry={retry} />
        </View>
      </Screen>
    );
  }

  const date = formatEventDate(event.starts_at ?? event.created_at);
  const isHost = event.created_by === profile?.id;

  const headerRight = (
    <View style={styles.headerActions}>
      {isHost ? (
        <CircleIconButton
          accessibilityLabel="Delete event"
          onPress={confirmDelete}
          disabled={deleting}
        >
          <SFSymbolIcon name="trash" color={theme.colors.danger} />
        </CircleIconButton>
      ) : null}
      <CircleIconButton accessibilityLabel="Add to event" onPress={() => setCreateOpen(true)}>
        <SFSymbolIcon name="plus" />
      </CircleIconButton>
    </View>
  );

  return (
    <>
      <Screen
        title={event.title}
        description={date || undefined}
        detail={event.description?.trim() || undefined}
        onRefresh={refresh}
        refreshing={refreshing}
        headerLeft={<EventBackButton />}
        headerRight={headerRight}
      >
        <View style={styles.content}>
          {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
          <AvatarStack
            people={event.members.map((member) => ({
              id: member.id,
              name: member.username ?? '?',
              color: member.avatar_color,
            }))}
            onPress={() => openManagePeople(eventId)}
            accessibilityLabel="Manage people"
          />

          <View style={styles.tabSection}>
            <Tabs
              tabs={EVENT_TABS}
              value={tab}
              onChange={setTab}
              accessibilityLabel="Event sections"
            />
            <View style={styles.tabPanel}>
              <View style={tab === 'photos' ? undefined : styles.hidden}>
                <EventPhotos
                  eventId={eventId}
                  hostId={event.created_by}
                  userId={profile?.id}
                  pickRequest={photoPickRequest}
                />
              </View>
              {tab === 'expenses' ? <EventExpenses eventId={eventId} /> : null}
            </View>
          </View>
        </View>
      </Screen>

      <EventActionModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onAddPhoto={() => {
          setTab('photos');
          setPhotoPickRequest((n) => n + 1);
        }}
        onAddExpense={() =>
          router.push({ pathname: '/expenses/new', params: { eventId } })
        }
      />
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      marginTop: theme.spacing[3],
      gap: theme.spacing[8],
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    tabSection: {
      gap: theme.spacing[4],
    },
    tabPanel: {
      minHeight: theme.spacing[16],
    },
    hidden: {
      display: 'none',
    },
    error: {
      ...theme.typography.bodySm,
      color: theme.colors.danger,
    },
  });
}
