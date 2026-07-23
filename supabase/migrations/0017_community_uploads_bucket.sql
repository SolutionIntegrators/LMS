-- Storage bucket for images embedded in community posts/replies (public
-- read; each user manages only their own folder, keyed by their user id as
-- the first path segment) — mirrors the avatars bucket in 0015.
insert into storage.buckets (id, name, public)
values ('community-uploads', 'community-uploads', true)
on conflict (id) do nothing;

create policy community_uploads_public_read on storage.objects
  for select using (bucket_id = 'community-uploads');

create policy community_uploads_own_insert on storage.objects
  for insert with check (bucket_id = 'community-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy community_uploads_own_update on storage.objects
  for update using (bucket_id = 'community-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy community_uploads_own_delete on storage.objects
  for delete using (bucket_id = 'community-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
