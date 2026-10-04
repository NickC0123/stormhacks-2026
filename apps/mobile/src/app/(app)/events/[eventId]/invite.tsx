import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PeopleManager } from '@/components/people/PeopleManager';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function EventPeopleScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return <Screen title="Manage people" withHeader>
    <View style={{ gap: 24, marginTop: 24 }}>
      <PeopleManager kind="event" id={eventId} />
      <Button label="Done" variant="secondary" onPress={() => router.back()} />
    </View>
  </Screen>;
}
