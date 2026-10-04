import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

export type TabItem<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * In-content tablist (design-spec 6.10): underline indicator on the selected tab.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel = 'Tabs',
}: Props<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={styles.list}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      flexDirection: 'row',
      borderBottomWidth: theme.sizes.borderWidth,
      borderBottomColor: theme.colors.borderSubtle,
    },
    tab: {
      height: theme.sizes.controlMd,
      paddingHorizontal: theme.spacing[4],
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: theme.sizes.borderWidth,
      borderBottomColor: theme.colors.borderSubtle,
      marginBottom: -theme.sizes.borderWidth,
    },
    tabSelected: {
      borderBottomWidth: theme.sizes.tabIndicator,
      borderBottomColor: theme.colors.accentStrong,
      marginBottom: -theme.sizes.tabIndicator,
    },
    tabPressed: {
      opacity: 0.85,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    labelSelected: {
      color: theme.colors.textPrimary,
    },
  });
}
