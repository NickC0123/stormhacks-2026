import { useEffect, useState } from 'react';

import { getEvent, listEvents } from '@/lib/events';
import { listEventPhotos } from '@/lib/photos';
import type { EventListItem, EventPhoto, EventUser } from '@/types';

/** One event's photos, played oldest to newest like a story. */
export type EventStory = {
  event: EventListItem;
  members: EventUser[];
  photos: EventPhoto[];
};

const time = (iso: string) => new Date(iso).getTime();

/** Events with photos, the event with the newest photo first. */
async function loadStories(): Promise<EventStory[]> {
  const events = await listEvents();
  // One event failing to load shouldn't hide everyone else's stories.
  const withPhotos = (await Promise.all(events.map(async (event) => ({
    event,
    photos: await listEventPhotos(event.id).catch(() => [] as EventPhoto[]),
  })))).filter((story) => story.photos.length > 0);
  const details = await Promise.all(withPhotos.map(({ event }) => getEvent(event.id).catch(() => null)));
  return withPhotos
    .map(({ event, photos }, i) => ({
      event,
      members: details[i]?.members ?? [],
      photos: [...photos].sort((a, b) => time(a.created_at) - time(b.created_at)),
    }))
    .sort((a, b) => time(b.photos[b.photos.length - 1].created_at) - time(a.photos[a.photos.length - 1].created_at));
}

/** Loads once per open; signed photo URLs would otherwise change mid-story. */
export function useEventStories() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; stories?: EventStory[]; error?: string } | null>(null);

  useEffect(() => {
    let active = true;
    loadStories()
      .then((stories) => { if (active) setResult({ attempt, stories }); })
      .catch((err) => {
        if (active) setResult({ attempt, error: err instanceof Error ? err.message : 'Could not load stories.' });
      });
    return () => { active = false; };
  }, [attempt]);

  const current = result?.attempt === attempt ? result : null;
  return {
    stories: current?.stories ?? null,
    error: current?.error ?? null,
    loading: current === null,
    retry: () => setAttempt((n) => n + 1),
  };
}
