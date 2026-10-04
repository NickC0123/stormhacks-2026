export type EventDateTime = { date: string; time: string };

export function dateTimeFields(date: Date): EventDateTime {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** Parse local wall time, rejecting invalid calendar dates and skipped DST times. */
export function parseEventDateTime(value: EventDateTime): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time)) {
    throw new Error('Enter a date as YYYY-MM-DD and a time as HH:MM.');
  }
  const parsed = new Date(`${value.date}T${value.time}:00`);
  const fields = Number.isNaN(parsed.getTime()) ? null : dateTimeFields(parsed);
  if (!fields || fields.date !== value.date || fields.time !== value.time) {
    throw new Error('Choose a valid date and time.');
  }
  return parsed;
}

export function eventSchedulePayload(start: EventDateTime | null, end: EventDateTime | null) {
  if (!start && end) throw new Error('Choose a start time before adding an end time.');
  const startsAt = start ? parseEventDateTime(start) : null;
  const endsAt = end ? parseEventDateTime(end) : null;
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error('End time must be after the start time.');
  return { starts_at: startsAt?.toISOString() ?? null, ends_at: endsAt?.toISOString() ?? null };
}
