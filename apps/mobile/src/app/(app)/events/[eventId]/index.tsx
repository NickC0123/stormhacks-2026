import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventActionModal } from '@/components/events/EventActionModal';
import { EventExpenses } from '@/components/events/EventExpenses';
import { EventPhotos } from '@/components/events/EventPhotos';
import { ExpenseBalanceDashboard } from '@/components/expenses/ExpenseBalanceDashboard';
import { Button } from '@/components/ui/Button';
import { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { BackButton } from '@/components/ui/BackButton';
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

type EventTab = 'photos' | 'expenses' | 'overview';

const EVENT_TABS: { value: EventTab; label: string }[] = [
  { value: 'photos', label: 'Photos' },
  { value: 'overview', label: 'Overview' },
  { value: 'expenses', label: 'Expenses' },
];

function openManagePeople(eventId: string) {
  router.push({ pathname: '/events/[eventId]/invite', params: { eventId } });
}

function EventOverview({ eventId }: { eventId: string }) {
  const balances = useExpenseBalances(eventId);
  return <ExpenseBalanceDashboard balances={balances} eventOnly />;
}

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { profile } = useProfile();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState<EventTab>('photos');
  const [refreshVersion, setRefreshVersion] = useState(0);
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
      <Screen title="Event" headerLeft={<BackButton />} headerRight={<View />}>
        <View style={styles.content}>
          <LoadState loading={loading} error={error} fallbackError="Could not load this event." onRetry={retry} />
        </View>
      </Screen>
    );
  }

  const date = formatEventDate(event.starts_at ?? event.created_at);
  const isHost = event.created_by === profile?.id;

  return (
    <>
      <Screen
        title={event.title}
        description={date || undefined}
        detail={event.description?.trim() || undefined}
        onRefresh={() => { setRefreshVersion((version) => version + 1); void refresh(); }}
        refreshing={refreshing}
        headerLeft={<BackButton />}
        headerRight={
          isHost ? (
            <CircleIconButton
              accessibilityLabel="Delete event"
              onPress={confirmDelete}
              disabled={deleting}
            >
              <SFSymbolIcon name="trash" color={theme.colors.danger} />
            </CircleIconButton>
          ) : (
            <View />
          )
        }
      >
        <View style={styles.content}>
          {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
          <View style={styles.peopleRow}>
          <AvatarStack
            people={event.members.map((member) => ({
              id: member.id,
              name: member.username ?? '?',
              color: member.avatar_color,
            }))}
            onPress={() => openManagePeople(eventId)}
            accessibilityLabel="Manage people"
          />
          {isHost ? <Button label="Edit event" size="sm" variant="secondary" onPress={() => router.push({ pathname: '/events/[eventId]/edit', params: { eventId } })} /> : null}
          </View>

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
              {tab === 'overview' ? <EventOverview key={`${eventId}:${refreshVersion}`} eventId={eventId} /> : null}
              {tab === 'expenses' ? <EventExpenses eventId={eventId} refreshVersion={refreshVersion} /> : null}
            </View>
          </View>
        </View>
      </Screen>

      <View
        pointerEvents="box-none"
        style={[
          styles.fabWrap,
          {
            bottom: Math.max(insets.bottom, theme.spacing[4]) + theme.spacing[2],
            right: theme.sizes.pagePaddingX,
          },
        ]}
      >
        <CircleIconButton
          variant="accent"
          accessibilityLabel="Add to event"
          onPress={() => setCreateOpen(true)}
        >
          <SFSymbolIcon name="plus" color={theme.colors.onAccent} />
        </CircleIconButton>
      </View>

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
    peopleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[3], flexWrap: 'wrap' },
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
    fabWrap: {
      position: 'absolute',
      zIndex: 1,
    },
  });
}
