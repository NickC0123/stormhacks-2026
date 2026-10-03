import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="events/new" options={{ presentation: 'modal', headerShown: true, title: 'New plan' }} />
        <Stack.Screen
          name="events/[eventId]/receipts/scan"
          options={{ headerShown: true, title: 'Add receipt', headerBackTitle: 'Back' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
