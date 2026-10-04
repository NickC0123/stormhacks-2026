begin;

alter table public.expenses add column split_customized boolean not null default false;
-- Preserve participants explicitly selected before equal splitting was introduced.
update public.expenses e set split_customized = true where exists (
  select 1 from public.expense_members m where m.expense_id = e.id and m.user_id <> e.created_by
) or exists (select 1 from public.expense_invites i where i.expense_id = e.id);

insert into public.expense_members (expense_id, user_id)
select id, created_by from public.expenses on conflict do nothing;
insert into public.expense_members (expense_id, user_id)
select e.id, m.user_id from public.expenses e
join public.event_members m on m.event_id = e.event_id
where not e.split_customized on conflict do nothing;

-- Seed defaults atomically with the expense. Moving an unmodified expense to an
-- event uses that event's members. Updating its amount preserves its selection.
create function public.initialize_expense_split() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.event_id is not distinct from old.event_id or new.split_customized then
      return new;
    end if;
    delete from public.expense_members where expense_id = new.id;
  end if;
  insert into public.expense_members (expense_id, user_id)
  values (new.id, new.created_by) on conflict do nothing;
  if new.event_id is not null then
    insert into public.expense_members (expense_id, user_id)
    select new.id, user_id from public.event_members where event_id = new.event_id
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger initialize_expense_split after insert or update of event_id on public.expenses
for each row execute function public.initialize_expense_split();

create function public.mark_expense_split_customized() returns trigger
language plpgsql set search_path = public as $$
declare target_id uuid;
begin
  target_id := case when tg_op = 'DELETE' then old.expense_id else new.expense_id end;
  -- Nested mutations are the default initializer or a cascading expense deletion.
  if pg_trigger_depth() = 1 then
    perform 1 from public.expenses where id = target_id for update;
    if tg_op = 'DELETE' and exists (select 1 from public.expenses where id = target_id)
       and (select count(*) from public.expense_members where expense_id = target_id) <= 1 then
      raise exception 'An expense needs at least one person in its split.' using errcode = '23514';
    end if;
    update public.expenses set split_customized = true where id = target_id;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
create trigger mark_expense_split_customized before insert or delete on public.expense_members
for each row execute function public.mark_expense_split_customized();
create trigger mark_pending_expense_split_customized before insert on public.expense_invites
for each row execute function public.mark_expense_split_customized();

-- Service-role-only input snapshot: no pending invitees, no unrelated expenses.
create function public.expense_balance_inputs(p_user_id uuid, p_event_id uuid default null)
returns table (id uuid, created_by uuid, title text, currency text, amount numeric, member_ids uuid[])
language sql stable set search_path = public as $$
  select e.id, e.created_by, e.title, e.currency, e.amount,
    array(select m.user_id from public.expense_members m where m.expense_id = e.id order by m.user_id)
  from public.expenses e
  where (e.created_by = p_user_id or exists (
    select 1 from public.expense_members m where m.expense_id = e.id and m.user_id = p_user_id
  )) and (p_event_id is null or e.event_id = p_event_id)
  order by e.id
$$;
revoke all on function public.expense_balance_inputs(uuid, uuid) from public, anon, authenticated;
grant execute on function public.expense_balance_inputs(uuid, uuid) to service_role;
revoke all on function public.initialize_expense_split() from public, anon, authenticated;
revoke all on function public.mark_expense_split_customized() from public, anon, authenticated;
commit;
