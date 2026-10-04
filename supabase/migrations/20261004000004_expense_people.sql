begin;

-- Expenses have explicit participants independently of event membership.
create table public.expense_members (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);
create index on public.expense_members (user_id);

create table public.expense_invites (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (expense_id, invitee_id),
  check (inviter_id <> invitee_id)
);
create index on public.expense_invites (invitee_id);
alter table public.expense_members enable row level security;
alter table public.expense_invites enable row level security;
-- Access is checked by the API; clients cannot mutate membership directly.
grant all on public.expense_members, public.expense_invites to service_role;

commit;
