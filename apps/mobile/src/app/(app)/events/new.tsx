import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { EventForm } from '@/components/events/EventForm';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';

export default function NewEventScreen() {
  const [busy, setBusy] = useState(false);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="Add event" headerLeft={<View />} headerRight={
      <CircleIconButton accessibilityLabel="Close" disabled={busy} onPress={() => router.back()}><SFSymbolIcon name="xmark" /></CircleIconButton>
    }>
      <EventForm onBusyChange={setBusy} />
    </Screen>
  </KeyboardAvoidingView>;
}
