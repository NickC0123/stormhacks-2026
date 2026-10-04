import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

// Below 1, the picker re-encodes as JPEG, which also converts iOS HEIC photos and keeps uploads small.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
};

/** Take or choose a single receipt photo. */
export function useReceiptPicker() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

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
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (result.canceled) return null;
      setAsset(result.assets[0]);
      return result.assets[0];
    } catch {
      Alert.alert('Camera unavailable', 'This device has no camera. Choose a photo from your library instead.');
      return null;
    }
  }

  async function chooseFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return null;
    setAsset(result.assets[0]);
    return result.assets[0];
  }

  return { asset, takePhoto, chooseFromLibrary, clear: () => setAsset(null) };
}
