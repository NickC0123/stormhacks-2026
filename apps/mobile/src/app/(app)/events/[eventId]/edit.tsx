import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { EventForm } from '@/components/events/EventForm';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getEvent } from '@/lib/events';
import { useProfile } from '@/lib/profile';
import { useTheme } from '@/theme';

export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { profile } = useProfile();
  const loader = useCallback(() => getEvent(eventId), [eventId]);
  const { data, loading, error, retry } = useFocusedData(loader, 'Could not load this event.');
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="Edit event" headerLeft={<View />} headerRight={
      <CircleIconButton accessibilityLabel="Close event editor" disabled={busy} onPress={() => router.back()}><SFSymbolIcon name="xmark" /></CircleIconButton>
    }>
      {!data ? <LoadState loading={loading} error={error} fallbackError="Could not load this event." onRetry={retry} /> : data.created_by !== profile?.id
        ? <Text style={{ color: theme.colors.textSecondary }}>Only the host can edit this event.</Text>
        : <EventForm key={data.id} event={data} onBusyChange={setBusy} />}
    </Screen>
  </KeyboardAvoidingView>;
}
