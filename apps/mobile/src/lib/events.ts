import { apiFetch } from '@/lib/api';
import type {
  EventDetail,
  EventHomeItem,
  EventSummary,
  EventUser,
  IncomingInvite,
  PersonAdded,
} from '@/types';

export function listEvents(): Promise<EventHomeItem[]> {
  return apiFetch<EventHomeItem[]>('/events');
}

export function getEvent(eventId: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`/events/${eventId}`);
}

/** Host only. Deletes the event with its expenses, photos and payments. */
export function deleteEvent(eventId: string): Promise<void> {
  return apiFetch<void>(`/events/${eventId}`, { method: 'DELETE' });
}

export function inviteToEvent(eventId: string, userId: string): Promise<PersonAdded> {
  return apiFetch<PersonAdded>(`/events/${eventId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function listIncomingInvites(): Promise<IncomingInvite[]> {
  return apiFetch<IncomingInvite[]>('/invites');
}

export function acceptInvite(inviteId: string): Promise<EventSummary> {
  return apiFetch<EventSummary>(`/invites/${inviteId}/accept`, { method: 'POST' });
}

/** Declines (as the invitee) or cancels (as an event member). */
export function removeInvite(inviteId: string): Promise<void> {
  return apiFetch<void>(`/invites/${inviteId}`, { method: 'DELETE' });
}

export function displayName(user: EventUser): string {
  return user.username ? `@${user.username}` : 'Unknown user';
}

/** Compact age like "now", "5m", "3h", "2d"; older than a week shows the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Day number and short month for archive date badges; the year only when it isn't this year. */
export function archiveDate(iso: string, now = new Date()): { day: string; month: string; full: string } {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, sameYear ? { month: 'short' } : { month: 'short', year: 'numeric' }),
    full: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
