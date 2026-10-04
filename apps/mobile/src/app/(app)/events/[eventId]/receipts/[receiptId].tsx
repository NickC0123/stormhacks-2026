import { View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/ui/Screen';

export default function ReceiptScreen() {
  return (
    <Screen
      title="Receipt"
      description="Assign receipt items to friends."
      headerLeft={<BackButton />}
      headerRight={<View />}
    />
  );
}
