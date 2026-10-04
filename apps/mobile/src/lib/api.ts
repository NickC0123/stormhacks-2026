import { File, UploadType } from 'expo-file-system';

import { env } from './env';
import { supabase } from './supabase';

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return token;
}

async function refreshAccessToken(): Promise<string> {
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  const token = refreshed.session?.access_token;
  if (error || !token) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Your session has expired. Please sign in again.');
  }
  return token;
}

function detailFromBody(text: string, status: number): string {
  try {
    const { detail } = JSON.parse(text);
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((error) => `${error.loc?.slice(1).join('.') || 'Input'}: ${error.msg}`)
        .join('\n');
    }
  } catch {
    // Not a FastAPI JSON error; fall through to the raw body.
  }
  return text ? `API ${status}: ${text}` : `API ${status}`;
}

/** Fetch wrapper for the FastAPI backend that forwards the Supabase access token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = await accessToken();

  const request = (access: string) =>
    fetch(`${env.apiUrl}/api/v1${path}`, {
      ...init,
      headers: {
        // FormData bodies need fetch to set the multipart boundary itself.
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
        Authorization: `Bearer ${access}`,
      },
    });

  let res = await request(token);
  if (res.status === 401) {
    token = await refreshAccessToken();
    res = await request(token);
  }

  if (!res.ok) {
    throw new Error(detailFromBody(await res.text(), res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type UploadFileOptions = {
  fieldName?: string;
  mimeType?: string;
};

/**
 * Multipart file upload via the native Expo File uploader (streams; more reliable than
 * fetch+FormData for large photos on iOS, which often fails with "network connection was lost").
 */
export async function apiUploadFile<T>(
  path: string,
  fileUri: string,
  options: UploadFileOptions = {},
): Promise<T> {
  const file = new File(fileUri);
  const upload = (access: string) =>
    file.upload(`${env.apiUrl}/api/v1${path}`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: options.fieldName ?? 'file',
      mimeType: options.mimeType ?? 'image/jpeg',
      headers: { Authorization: `Bearer ${access}` },
    });

  let token = await accessToken();
  let result = await upload(token);
  if (result.status === 401) {
    token = await refreshAccessToken();
    result = await upload(token);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(detailFromBody(result.body, result.status));
  }
  if (result.status === 204 || !result.body) return undefined as T;
  return JSON.parse(result.body) as T;
}
