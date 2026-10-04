-- Swap the Snapchat contact field for Facebook. Existing Snapchat values are dropped
-- because they aren't valid Facebook usernames.

alter table public.profiles drop column snapchat;
alter table public.profiles add column facebook text check (char_length(facebook) <= 100);

update public.profiles
set visible_contacts = array_remove(visible_contacts, 'snapchat')
where 'snapchat' = any (visible_contacts);

alter table public.profiles drop constraint profiles_visible_contacts_check;
alter table public.profiles add constraint profiles_visible_contacts_check check (
  visible_contacts <@ array['instagram', 'facebook', 'whatsapp', 'etransfer_email', 'etransfer_phone']
);
