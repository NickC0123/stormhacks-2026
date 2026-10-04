-- Optional contact details on profiles: social handles and e-transfer info.
-- Every field is hidden until its kind is listed in visible_contacts.
-- Friends and people who share an event with the user see the visible ones.

alter table public.profiles
  add column instagram text check (char_length(instagram) <= 100),
  add column snapchat text check (char_length(snapchat) <= 100),
  add column whatsapp text check (char_length(whatsapp) <= 100),
  add column etransfer_email text check (char_length(etransfer_email) <= 100),
  add column etransfer_phone text check (char_length(etransfer_phone) <= 100),
  add column visible_contacts text[] not null default '{}'
    check (
      visible_contacts <@ array['instagram', 'snapchat', 'whatsapp', 'etransfer_email', 'etransfer_phone']
    );
