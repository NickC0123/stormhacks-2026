import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="events/new" options={{ presentation: 'modal', headerShown: true, title: 'New plan' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
