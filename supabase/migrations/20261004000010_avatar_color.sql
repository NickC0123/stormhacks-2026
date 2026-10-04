-- Stable per-user avatar accent (iOS system color name). Assigned once when the
-- profile row is created; existing rows get a deterministic color from their id.

alter table public.profiles
  add column avatar_color text;

update public.profiles
set avatar_color = (array[
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'cyan',
  'indigo',
  'brown'
])[1 + (get_byte(decode(md5(id::text), 'hex'), 0) % 12)]
where avatar_color is null;

alter table public.profiles
  alter column avatar_color set not null;

alter table public.profiles
  add constraint profiles_avatar_color_check check (
    avatar_color in (
      'blue',
      'purple',
      'pink',
      'red',
      'orange',
      'yellow',
      'green',
      'mint',
      'teal',
      'cyan',
      'indigo',
      'brown'
    )
  );
