begin;
-- Include event start time on balance inputs for drawer/card event dates.
drop function if exists public.expense_balance_inputs(uuid, uuid);
create function public.expense_balance_inputs(p_user_id uuid, p_event_id uuid default null)
returns table (
  id uuid,
  created_by uuid,
  title text,
  currency text,
  amount numeric,
  member_ids uuid[],
  event_id uuid,
  event_title text,
  event_starts_at timestamptz,
  date date
)
language sql stable set search_path = public as $$
  select e.id, e.created_by, e.title, e.currency, e.amount,
    array(select m.user_id from public.expense_members m where m.expense_id = e.id order by m.user_id),
    e.event_id,
    ev.title,
    ev.starts_at,
    e.date
  from public.expenses e
  left join public.events ev on ev.id = e.event_id
  where (e.created_by = p_user_id or exists (
    select 1 from public.expense_members m where m.expense_id = e.id and m.user_id = p_user_id
  )) and (p_event_id is null or e.event_id = p_event_id)
  order by e.id
$$;
revoke all on function public.expense_balance_inputs(uuid, uuid) from public, anon, authenticated;
grant execute on function public.expense_balance_inputs(uuid, uuid) to service_role;
commit;
