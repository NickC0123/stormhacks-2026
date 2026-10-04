import { apiFetch } from '@/lib/api';
import type { EventDetail, EventInvite, EventListItem, EventSummary, EventUser, IncomingInvite } from '@/types';

export function listEvents(): Promise<EventListItem[]> {
  return apiFetch<EventListItem[]>('/events');
}

export function getEvent(eventId: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`/events/${eventId}`);
}

export function inviteToEvent(eventId: string, userId: string): Promise<EventInvite> {
  return apiFetch<EventInvite>(`/events/${eventId}/invites`, {
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

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
