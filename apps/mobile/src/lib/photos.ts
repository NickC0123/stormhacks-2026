import type { ImagePickerAsset } from 'expo-image-picker';

import type { EventPhoto } from '@/types';

import { apiFetch, apiUploadFile } from './api';

export const listEventPhotos = (eventId: string) => apiFetch<EventPhoto[]>(`/events/${eventId}/photos`);

function mimeForAsset(asset: ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType;
  const uri = asset.uri.toLowerCase();
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.webp')) return 'image/webp';
  if (uri.endsWith('.heic') || uri.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function isTransientNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /network connection was lost|network request failed|timed out|the internet connection|NSURLError/i.test(
    message,
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Upload one event photo, retrying briefly on flaky mobile network drops. */
export async function uploadEventPhoto(eventId: string, asset: ImagePickerAsset): Promise<EventPhoto> {
  const mimeType = mimeForAsset(asset);
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await apiUploadFile<EventPhoto>(`/events/${eventId}/photos`, asset.uri, {
        fieldName: 'file',
        mimeType,
      });
    } catch (err) {
      lastError = err;
      if (!isTransientNetworkError(err) || attempt === 2) break;
      await sleep(500 * (attempt + 1));
    }
  }
  if (lastError instanceof Error && isTransientNetworkError(lastError)) {
    throw new Error('Upload failed because the connection dropped. Please try again.');
  }
  throw lastError instanceof Error ? lastError : new Error('Could not upload photo.');
}

/** The photo's uploader or the event host only. */
export const deleteEventPhoto = (eventId: string, photoId: string) =>
  apiFetch<void>(`/events/${eventId}/photos/${photoId}`, { method: 'DELETE' });
