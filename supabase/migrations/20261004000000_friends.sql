-- Usernames and friend requests.
-- Usernames are stored lowercase so uniqueness and lookups are case-insensitive.

alter table public.profiles
  add column username text unique
    check (username ~ '^[a-z0-9_]{3,20}$');

-- One row per pair of users. A pending row is a request from requester to addressee;
-- declining, cancelling, or unfriending deletes the row.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_key on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index on public.friendships (requester_id);
create index on public.friendships (addressee_id);

alter table public.friendships enable row level security;
