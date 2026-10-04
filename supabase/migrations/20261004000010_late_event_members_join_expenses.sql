-- People who join an event later are added to the event's existing expenses, so they
-- share them equally. Expenses whose people were edited by hand (split_customized) keep
-- their selection. Inserts from this trigger run nested, so they do not mark an expense
-- as customized.
begin;

create function public.add_event_member_to_expenses() returns trigger
language plpgsql set search_path = public as $$
begin
  insert into public.expense_members (expense_id, user_id)
  select e.id, new.user_id from public.expenses e
  where e.event_id = new.event_id and not e.split_customized
  on conflict do nothing;
  return new;
end $$;
create trigger add_event_member_to_expenses after insert on public.event_members
for each row execute function public.add_event_member_to_expenses();
revoke all on function public.add_event_member_to_expenses() from public, anon, authenticated;

-- Catch up members who joined before this migration. This top-level insert would
-- otherwise mark every touched expense as customized.
alter table public.expense_members disable trigger mark_expense_split_customized;
insert into public.expense_members (expense_id, user_id)
select e.id, m.user_id from public.expenses e
join public.event_members m on m.event_id = e.event_id
where not e.split_customized
on conflict do nothing;
alter table public.expense_members enable trigger mark_expense_split_customized;

commit;
