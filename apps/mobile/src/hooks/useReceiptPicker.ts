import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { receiptPhotoProblem } from '@/lib/receipts';

// Below 1, the picker re-encodes as JPEG, which also converts iOS HEIC photos and keeps uploads small.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
};

/** Take or choose a single receipt photo. Photos that are too big or the wrong type are rejected right away. */
export function useReceiptPicker() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');

  function pick(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const problem = receiptPhotoProblem(result.assets[0]);
    setError(problem ?? '');
    setAsset(problem ? null : result.assets[0]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings to photograph receipts.',
        permission.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      pick(result);
    } catch {
      Alert.alert('Camera unavailable', 'This device has no camera. Choose a photo from your library instead.');
    }
  }

  async function chooseFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    pick(result);
  }

  return { asset, error, takePhoto, chooseFromLibrary, clear: () => { setAsset(null); setError(''); } };
}
