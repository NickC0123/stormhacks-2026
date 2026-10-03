import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** Placeholder screen shell used while features are being built. */
export function Screen({ title, description, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '600' },
  description: { fontSize: 14, opacity: 0.7 },
});
