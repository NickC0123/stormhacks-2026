-- Event photos are stored as memories with a photo_path in this private bucket.
-- The API uploads with the service-role key and hands members short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

grant all on public.memories to service_role;
