import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReceiptPicker } from '@/hooks/useReceiptPicker';

export default function ScanReceiptScreen() {
  const { asset, takePhoto, chooseFromLibrary, clear } = useReceiptPicker();

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text style={styles.description}>Take a photo of the receipt or choose one from your library.</Text>
        <ActionButton label="Take photo" onPress={takePhoto} />
        <ActionButton label="Choose from library" onPress={chooseFromLibrary} variant="secondary" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={{ uri: asset.uri }}
        style={[styles.preview, { aspectRatio: asset.width / asset.height }]}
        resizeMode="contain"
      />
      <ActionButton label="Retake photo" onPress={takePhoto} variant="secondary" />
      <ActionButton label="Choose a different photo" onPress={chooseFromLibrary} variant="secondary" />
      <ActionButton label="Remove" onPress={clear} variant="secondary" />
    </ScrollView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

function ActionButton({ label, onPress, variant = 'primary' }: ActionButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  description: { fontSize: 15, opacity: 0.7, marginBottom: 8 },
  preview: { width: '100%', borderRadius: 12, backgroundColor: '#e5e7eb' },
  button: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#2563eb' },
  buttonSecondary: { borderWidth: 1, borderColor: '#2563eb' },
  buttonPressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextPrimary: { color: '#fff' },
  buttonTextSecondary: { color: '#2563eb' },
});
