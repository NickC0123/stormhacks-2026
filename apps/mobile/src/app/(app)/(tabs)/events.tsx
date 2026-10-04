import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable
          accessibilityLabel="Create event"
          accessibilityRole="button"
          onPress={() => router.push('/events/new')}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  addButtonText: { color: '#ffffff', fontSize: 40, lineHeight: 48 },
});
