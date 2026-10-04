import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReceiptPicker } from '@/hooks/useReceiptPicker';
import { scanReceipt } from '@/lib/receipts';
import type { ParsedReceipt } from '@/types';

type ScanState =
  | { uri: string; status: 'scanning' }
  | { uri: string; status: 'done'; receipt: ParsedReceipt }
  | { uri: string; status: 'error'; message: string };

export default function ScanReceiptScreen() {
  const { asset, takePhoto, chooseFromLibrary, clear } = useReceiptPicker();
  const [scanState, setScanState] = useState<ScanState | null>(null);

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text style={styles.description}>Take a photo of the receipt or choose one from your library.</Text>
        <ActionButton label="Take photo" onPress={takePhoto} />
        <ActionButton label="Choose from library" onPress={chooseFromLibrary} variant="secondary" />
      </View>
    );
  }

  // Results belong to the photo they were scanned from, so a new photo starts fresh.
  const scan = scanState?.uri === asset.uri ? scanState : null;

  async function runScan() {
    if (!asset) return;
    const { uri } = asset;
    setScanState({ uri, status: 'scanning' });
    try {
      setScanState({ uri, status: 'done', receipt: await scanReceipt(asset) });
    } catch (error) {
      setScanState({ uri, status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={{ uri: asset.uri }}
        style={[styles.preview, { aspectRatio: asset.width / asset.height }]}
        resizeMode="contain"
      />

      {scan?.status === 'scanning' ? (
        <View style={styles.scanning}>
          <ActivityIndicator />
          <Text style={styles.description}>Reading receipt...</Text>
        </View>
      ) : (
        <ActionButton label={scan ? 'Scan again' : 'Scan receipt'} onPress={runScan} />
      )}

      {scan?.status === 'error' ? <Text style={styles.error}>{scan.message}</Text> : null}

      {scan?.status === 'done' ? (
        <>
          {scan.receipt.warnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              {warning}
            </Text>
          ))}
          <Text style={styles.json} selectable>
            {JSON.stringify(scan.receipt, null, 2)}
          </Text>
        </>
      ) : null}

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
  scanning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  error: { color: '#b91c1c', fontSize: 15 },
  warning: { backgroundColor: '#fef3c7', color: '#92400e', padding: 10, borderRadius: 8, fontSize: 14 },
  json: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    backgroundColor: '#f3f4f6',
    color: '#111827',
    padding: 12,
    borderRadius: 8,
  },
  button: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#2563eb' },
  buttonSecondary: { borderWidth: 1, borderColor: '#2563eb' },
  buttonPressed: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextPrimary: { color: '#fff' },
  buttonTextSecondary: { color: '#2563eb' },
});
