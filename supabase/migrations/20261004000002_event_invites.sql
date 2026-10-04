-- Pending invitations to join an event.
-- Accepting inserts an event_members row and deletes the invite;
-- declining or cancelling just deletes it.

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, invitee_id),
  check (inviter_id <> invitee_id)
);

create index on public.event_invites (invitee_id);

alter table public.event_invites enable row level security;
