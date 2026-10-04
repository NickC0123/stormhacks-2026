import { router } from 'expo-router';

import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';

type Props = {
  /** Defaults to `router.back()`. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Circular chevron back control used on push subpages (not modal close). */
export function BackButton({
  onPress,
  accessibilityLabel = 'Back',
}: Props) {
  return (
    <CircleIconButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ?? (() => router.back())}
    >
      <SFSymbolIcon name="chevron.left" />
    </CircleIconButton>
  );
}
