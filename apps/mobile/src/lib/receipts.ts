import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { ParsedReceipt } from '@/types';

import { apiFetch } from './api';

// Matches the API's limits, so a photo it would reject never gets uploaded.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Why a receipt photo can't be uploaded, or null if it looks fine. Checked before any upload. */
export function receiptPhotoProblem(asset: ImagePickerAsset): string | null {
  if (asset.mimeType && !IMAGE_TYPES.includes(asset.mimeType.toLowerCase())) {
    return 'Unsupported file. Choose a JPEG, PNG, WebP, or HEIC image.';
  }
  let size = asset.fileSize;
  if (size == null) {
    try {
      size = new File(asset.uri).size;
    } catch {
      // Size unknown; the API still enforces the limit.
    }
  }
  if (size != null && size > MAX_IMAGE_BYTES) {
    return `This photo is ${(size / 1024 / 1024).toFixed(1)} MB. Receipt photos must be 10 MB or smaller.`;
  }
  return null;
}

/** Upload a receipt photo and get back the JSON Gemini extracted from it. */
export function scanReceipt(asset: ImagePickerAsset): Promise<ParsedReceipt> {
  const form = new FormData();
  // Expo's fetch only uploads Blob-like parts, not React Native's { uri, name, type } objects.
  form.append('file', new File(asset.uri) as unknown as Blob);
  return apiFetch<ParsedReceipt>('/receipts/scan', { method: 'POST', body: form });
}
