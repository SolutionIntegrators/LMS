-- Community discussion board, scoped per product (course), with a time-limited
-- access window anchored to user_product_access.granted_at. Students are
-- subscribed to all community activity for a course by default (per-thread
-- mute is the only opt-out); the admin gets emailed on every new thread.

-- ── Products: configurable community access window ──────────────────────────
alter table public.products add column if not exists community_access_months integer not null default 6;

-- ── Lessons: allow a 'community' content type (renders the board, not media) ─
alter table public.lessons drop constraint if exists lessons_content_type_check;
alter table public.lessons add constraint lessons_content_type_check
  check (content_type in ('video','pdf','download','text','embed','community'));

-- ── Helper: does this user currently have LIVE (non-expired) community access
-- to this product? Mirrors is_admin()'s SECURITY DEFINER pattern so it can be
-- used directly inside RLS policies without recursing into other tables' RLS.
create or replace function public.has_active_community_access(p_user_id uuid, p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.user_product_access upa
    join public.products p on p.id = upa.product_id
    where upa.user_id = p_user_id
      and upa.product_id = p_product_id
      and upa.granted_at + (p.community_access_months || ' months')::interval > now()
  )
$$;

-- ── Tables ────────────────────────────────────────────────────────────────────
create table if not exists public.community_threads (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  author_user_id  uuid references auth.users(id) on delete set null,
  title           text not null,
  body            text not null,
  is_pinned       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.community_replies (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.community_threads(id) on delete cascade,
  author_user_id  uuid references auth.users(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

-- One row per (user, course): the course-level default subscription. Created
-- automatically on purchase (see lib/grant.ts); subscribed=true by default.
create table if not exists public.community_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  subscribed  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Presence of a row = muted. Per-thread opt-out, independent of the course-level
-- subscription above.
create table if not exists public.community_thread_mutes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  thread_id  uuid not null references public.community_threads(id) on delete cascade,
  muted_at   timestamptz not null default now(),
  unique (user_id, thread_id)
);

create index if not exists community_threads_product_idx on public.community_threads(product_id, created_at desc);
create index if not exists community_replies_thread_idx on public.community_replies(thread_id, created_at);
create index if not exists community_subscriptions_product_idx on public.community_subscriptions(product_id) where subscribed;
create index if not exists community_thread_mutes_thread_idx on public.community_thread_mutes(thread_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_subscriptions enable row level security;
alter table public.community_thread_mutes enable row level security;

-- community_threads: readable/postable only with live (non-expired) access.
create policy community_threads_admin_all on public.community_threads
  for all using (public.is_admin());
create policy community_threads_select on public.community_threads
  for select using (public.has_active_community_access(auth.uid(), product_id));
create policy community_threads_insert on public.community_threads
  for insert with check (
    author_user_id = auth.uid()
    and public.has_active_community_access(auth.uid(), product_id)
  );
-- Author may edit their own thread (e.g. fix a typo); admin covered above.
create policy community_threads_update_own on public.community_threads
  for update using (author_user_id = auth.uid())
  with check (author_user_id = auth.uid());

-- community_replies: gated on the PARENT thread's product access.
create policy community_replies_admin_all on public.community_replies
  for all using (public.is_admin());
create policy community_replies_select on public.community_replies
  for select using (
    public.has_active_community_access(
      auth.uid(),
      (select ct.product_id from public.community_threads ct where ct.id = thread_id)
    )
  );
create policy community_replies_insert on public.community_replies
  for insert with check (
    author_user_id = auth.uid()
    and public.has_active_community_access(
      auth.uid(),
      (select ct.product_id from public.community_threads ct where ct.id = thread_id)
    )
  );

-- community_subscriptions: users manage their own row; admin sees all (for support).
create policy community_subscriptions_admin_all on public.community_subscriptions
  for all using (public.is_admin());
create policy community_subscriptions_own on public.community_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- community_thread_mutes: users manage their own mutes; admin sees all.
create policy community_thread_mutes_admin_all on public.community_thread_mutes
  for all using (public.is_admin());
create policy community_thread_mutes_own on public.community_thread_mutes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
