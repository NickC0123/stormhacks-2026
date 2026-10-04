import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/theme';

type Props = {
  /** SF Symbol name (iOS). */
  name: SFSymbol;
  size?: number;
  color?: string;
};

/**
 * Renders an SF Symbol on iOS; falls back to a close Material/Ionicons glyph elsewhere.
 */
export function SFSymbolIcon({ name, size, color }: Props) {
  const theme = useTheme();
  const iconSize = size ?? theme.sizes.fabIcon;
  const tint = color ?? theme.colors.navItemInactive;

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name}
        size={iconSize}
        tintColor={tint}
        weight="regular"
        resizeMode="scaleAspectFit"
      />
    );
  }

  if (name === 'magnifyingglass') {
    return <Ionicons name="search" size={iconSize} color={tint} />;
  }

  if (name === 'plus') {
    return <Ionicons name="add" size={iconSize} color={tint} />;
  }

  if (name === 'xmark') {
    return <Ionicons name="close" size={iconSize} color={tint} />;
  }

  if (
    name === 'clock.arrow.circlepath' ||
    name === 'clock.arrow.trianglehead.counterclockwise.rotate.90'
  ) {
    return <MaterialCommunityIcons name="history" size={iconSize} color={tint} />;
  }

  return <Ionicons name="ellipse-outline" size={iconSize} color={tint} />;
}
