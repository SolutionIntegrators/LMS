-- Emoji reactions on threads/replies, author edit+delete for both, profile
-- avatars, and a public avatar-upload storage bucket.

-- ── Reactions ─────────────────────────────────────────────────────────────────
-- Exactly one of thread_id/reply_id is set per row (a reaction on a thread, or
-- on a reply). Fixed emoji palette kept in sync with lib/reactions.ts.
create table if not exists public.community_reactions (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid references public.community_threads(id) on delete cascade,
  reply_id    uuid references public.community_replies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  emoji       text not null check (emoji in ('👍','❤️','😂','🎉','🤔','👀')),
  created_at  timestamptz not null default now(),
  check ((thread_id is not null and reply_id is null) or (thread_id is null and reply_id is not null)),
  unique (user_id, thread_id, emoji),
  unique (user_id, reply_id, emoji)
);
create index if not exists community_reactions_thread_idx on public.community_reactions(thread_id);
create index if not exists community_reactions_reply_idx on public.community_reactions(reply_id);

alter table public.community_reactions enable row level security;

create policy community_reactions_admin_all on public.community_reactions
  for all using (public.is_admin());

create policy community_reactions_select on public.community_reactions
  for select using (
    public.has_active_community_access(
      auth.uid(),
      coalesce(
        (select ct.product_id from public.community_threads ct where ct.id = thread_id),
        (select ct.product_id from public.community_threads ct join public.community_replies cr on cr.thread_id = ct.id where cr.id = reply_id)
      )
    )
  );

create policy community_reactions_insert on public.community_reactions
  for insert with check (
    user_id = auth.uid()
    and public.has_active_community_access(
      auth.uid(),
      coalesce(
        (select ct.product_id from public.community_threads ct where ct.id = thread_id),
        (select ct.product_id from public.community_threads ct join public.community_replies cr on cr.thread_id = ct.id where cr.id = reply_id)
      )
    )
  );

create policy community_reactions_delete_own on public.community_reactions
  for delete using (user_id = auth.uid());

-- ── Author edit/delete on threads + replies ──────────────────────────────────
-- community_threads_update_own already existed (0013); add delete.
create policy community_threads_delete_own on public.community_threads
  for delete using (author_user_id = auth.uid());

-- community_replies had no author update/delete at all (0013) — add both.
create policy community_replies_update_own on public.community_replies
  for update using (author_user_id = auth.uid())
  with check (author_user_id = auth.uid());
create policy community_replies_delete_own on public.community_replies
  for delete using (author_user_id = auth.uid());

-- ── Profile avatar ────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ── Avatars storage bucket (public read; each user manages only their own
-- folder, keyed by their user id as the first path segment) ─────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_own_insert on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_own_update on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_own_delete on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
