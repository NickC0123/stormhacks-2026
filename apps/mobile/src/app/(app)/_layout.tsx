import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/new" options={{ presentation: 'modal', headerShown: true, title: 'New event' }} />
      <Stack.Screen
        name="events/[eventId]/receipts/scan"
        options={{ headerShown: true, title: 'Add receipt', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
