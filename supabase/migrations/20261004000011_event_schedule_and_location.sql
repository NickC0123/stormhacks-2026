-- Optional place and end time for scheduled events. Existing events remain valid.
begin;

alter table public.events
  add column if not exists location text,
  add column if not exists ends_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.events'::regclass
                 and conname = 'events_schedule_valid') then
    alter table public.events add constraint events_schedule_valid
      check (ends_at is null or (starts_at is not null and ends_at > starts_at));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.events'::regclass
                 and conname = 'events_location_length') then
    alter table public.events add constraint events_location_length
      check (location is null or length(location) <= 500);
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
