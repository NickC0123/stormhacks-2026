import { env } from './env';
import { supabase } from './supabase';

/** Fetch wrapper for the FastAPI backend that forwards the Supabase access token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const request = (accessToken: string) => fetch(`${env.apiUrl}/api/v1${path}`, {
    ...init,
    headers: {
      // FormData bodies need fetch to set the multipart boundary itself.
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let res = await request(token);
  if (res.status === 401) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token;
    if (error || !token) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Your session has expired. Please sign in again.');
    }
    res = await request(token);
  }

  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const { detail } = JSON.parse(text);
    if (typeof detail === 'string') return detail;
  } catch {
    // Not a FastAPI JSON error; fall through to the raw body.
  }
  return `API ${res.status}: ${text}`;
}
