import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/ui/BottomNav';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <BottomNav state={props.state} navigation={props.navigation} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Events' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Hidden for now — restore when Timeline returns. */}
      <Tabs.Screen name="timeline" options={{ href: null }} />
    </Tabs>
  );
}
