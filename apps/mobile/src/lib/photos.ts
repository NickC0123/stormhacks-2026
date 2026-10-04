import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { EventPhoto } from '@/types';

import { apiFetch } from './api';

export const listEventPhotos = (eventId: string) => apiFetch<EventPhoto[]>(`/events/${eventId}/photos`);

export function uploadEventPhoto(eventId: string, asset: ImagePickerAsset): Promise<EventPhoto> {
  const form = new FormData();
  // Expo's fetch only uploads Blob-like parts, not React Native's { uri, name, type } objects.
  form.append('file', new File(asset.uri) as unknown as Blob);
  return apiFetch<EventPhoto>(`/events/${eventId}/photos`, { method: 'POST', body: form });
}
