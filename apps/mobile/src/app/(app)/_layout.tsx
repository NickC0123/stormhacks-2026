import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/new" options={{ presentation: 'modal', headerShown: true, title: 'New event' }} />
      <Stack.Screen name="expenses/new" options={{ headerShown: true, title: 'New expense', headerBackTitle: 'Back' }} />
      <Stack.Screen name="expenses/[expenseId]" options={{ headerShown: true, title: 'Expense', headerBackTitle: 'Back' }} />
      <Stack.Screen
        name="events/[eventId]/receipts/scan"
        options={{ headerShown: true, title: 'Add receipt', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
