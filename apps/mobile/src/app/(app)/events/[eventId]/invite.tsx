import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeopleManager } from '@/components/people/PeopleManager';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useTheme, type Theme } from '@/theme';

export default function EventPeopleScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle} accessibilityRole="header">
            Manage People
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={theme.spacing[2]}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
          >
            <SFSymbolIcon name="xmark" color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <PeopleManager kind="event" id={eventId} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  const m = theme.createActionModal;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    content: {
      paddingHorizontal: theme.sizes.pagePaddingX,
      paddingBottom: theme.spacing[9],
      paddingTop: theme.spacing[12], // 48
      gap: theme.spacing[6],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    closeButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closePressed: {
      opacity: 0.7,
    },
    pageTitle: {
      ...theme.typography.h2,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'left',
      flex: 1,
    },
    button: {
      height: m.actionHeight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accent,
    },
    buttonPressed: {
      backgroundColor: theme.colors.accentActive,
    },
    buttonText: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.onAccent,
      textAlign: 'center',
    },
  });
}
