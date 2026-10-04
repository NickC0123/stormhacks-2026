import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/ui/Screen';

export default function EventMemoriesScreen() {
  return (
    <Screen
      title="Memories"
      description="Photos and notes for this event."
      headerLeft={<BackButton />}
      headerRight={<View />}
    />
  );
}
