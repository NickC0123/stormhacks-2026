import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { ParsedReceipt } from '@/types';

import { apiFetch } from './api';

/** Upload a receipt photo and get back the JSON Gemini extracted from it. */
export function scanReceipt(asset: ImagePickerAsset): Promise<ParsedReceipt> {
  const form = new FormData();
  // Expo's fetch only uploads Blob-like parts, not React Native's { uri, name, type } objects.
  form.append('file', new File(asset.uri) as unknown as Blob);
  return apiFetch<ParsedReceipt>('/receipts/scan', { method: 'POST', body: form });
}
