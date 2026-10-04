-- Settling up: the initial schema created `settlements` but nothing used it yet.
-- Balances subtract these payments, so recording one brings a debt back to zero.
-- Amounts are in CAD, like the balances they settle. A payment with an event_id
-- counts in that event's balances and overall; one without counts only overall.
begin;

alter table public.settlements
  add column currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  add column recorded_by uuid references public.profiles (id) on delete cascade;
update public.settlements set recorded_by = from_user_id where recorded_by is null;
alter table public.settlements
  alter column recorded_by set not null,
  add constraint settlements_distinct_users check (from_user_id <> to_user_id),
  add constraint settlements_recorded_by_party check (recorded_by in (from_user_id, to_user_id));

create index on public.settlements (from_user_id);
create index on public.settlements (to_user_id);
create index on public.settlements (event_id);
-- Access goes through the authenticated API, which scopes every query to its user.
grant all on public.settlements to service_role;

commit;
