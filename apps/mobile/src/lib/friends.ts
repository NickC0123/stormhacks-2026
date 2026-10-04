import { apiFetch } from '@/lib/api';
import type { FriendsOverview, Friendship, Profile } from '@/types';

/** Must match `USERNAME_PATTERN` in apps/api/app/services/friends.py. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const USERNAME_RULES = '3–20 characters: lowercase letters, numbers, and underscores.';

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export function getMe(): Promise<Profile> {
  return apiFetch<Profile>('/me');
}

export function setUsername(username: string): Promise<Profile> {
  return apiFetch<Profile>('/me/username', {
    method: 'PUT',
    body: JSON.stringify({ username }),
  });
}

export function getFriends(): Promise<FriendsOverview> {
  return apiFetch<FriendsOverview>('/friends');
}

export function sendFriendRequest(username: string): Promise<Friendship> {
  return apiFetch<Friendship>('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function acceptFriendRequest(id: string): Promise<Friendship> {
  return apiFetch<Friendship>(`/friends/requests/${id}/accept`, { method: 'POST' });
}

/** Declines, cancels, or unfriends depending on the friendship's state. */
export function removeFriendship(id: string): Promise<void> {
  return apiFetch<void>(`/friends/${id}`, { method: 'DELETE' });
}
