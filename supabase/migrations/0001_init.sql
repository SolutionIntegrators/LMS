-- ============================================================================
-- LMS PORTAL — canonical schema (run once against a fresh Supabase project)
-- ----------------------------------------------------------------------------
-- This is the single source of truth for a new client instance's database.
-- It is idempotent where practical and safe to run top-to-bottom in the
-- Supabase SQL editor (or `supabase db push`). Order matters: extensions →
-- functions → tables → RLS → policies → storage → trigger.
--
-- After running this, do the CONFIG steps in SETUP.md (env vars, SMTP, webhook)
-- and create the first admin (see the last block, commented, at the bottom).
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;      -- gen_random_uuid()

-- ── Helper functions ─────────────────────────────────────────────────────────
-- is_admin(): SECURITY DEFINER so RLS policies can check the caller's role
-- without recursing into profiles' own RLS. search_path pinned to '' per
-- Supabase security guidance (fully-qualify every object below).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- handle_new_user(): auto-create a profile row when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── Tables ────────────────────────────────────────────────────────────────────
-- profiles: one row per auth user. role + tags drive all authorization.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text default 'user' check (role in ('user','admin')),
  tags          text[] default '{}',
  last_login_at timestamptz,
  created_at    timestamptz default now()
);

-- products: top-level items (courses / bundles / "goodies").
create table if not exists public.products (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  slug                  text not null unique,
  description           text,
  category              text,
  cover_image_url       text,
  thumbnail_url         text,
  thumbnail_color       text,
  auto_grant_tags       text[] default '{}',
  grant_product_ids     uuid[] not null default '{}',  -- bundles: also unlock these products on purchase
  is_active             boolean default true,
  created_at            timestamptz default now()
);

-- modules: sections within a product.
create table if not exists public.modules (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.products(id) on delete cascade,
  title           text not null,
  description     text,
  thumbnail_url   text,
  thumbnail_color text,
  required_tag    text,
  sort_order      integer not null,
  created_at      timestamptz default now()
);

-- lessons: content within a module. content_blocks holds the rich editor JSON.
create table if not exists public.lessons (
  id             uuid primary key default gen_random_uuid(),
  module_id      uuid references public.modules(id) on delete cascade,
  title          text not null,
  description    text,
  content_type   text check (content_type in ('video','pdf','download','text','embed')),
  content_url    text,
  content_blocks jsonb not null default '[]'::jsonb,
  required_tag   text,
  is_preview     boolean default false,
  is_published   boolean not null default false,
  sort_order     integer not null,
  created_at     timestamptz default now()
);

-- user_product_access: who can see what. Written by the purchase webhook and
-- by admins; read by RLS on products/modules/lessons.
create table if not exists public.user_product_access (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  product_id      uuid references public.products(id) on delete cascade,
  granted_at      timestamptz default now(),
  granted_by      text,
  transaction_ref text,
  unique (user_id, product_id)
);

-- lesson_completions: progress tracking.
create table if not exists public.lesson_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  lesson_id    uuid references public.lessons(id) on delete cascade,
  completed_at timestamptz default now(),
  unique (user_id, lesson_id)
);

-- activity_logs: lightweight analytics / audit trail.
create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  event_type text not null,
  product_id uuid references public.products(id) on delete set null,
  module_id  uuid references public.modules(id) on delete set null,
  lesson_id  uuid references public.lessons(id) on delete set null,
  metadata   jsonb,
  created_at timestamptz default now()
);

-- site_settings: key/value store for the announcement banner etc.
create table if not exists public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.products            enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.user_product_access enable row level security;
alter table public.lesson_completions  enable row level security;
alter table public.activity_logs       enable row level security;
alter table public.site_settings       enable row level security;

-- profiles ---------------------------------------------------------------------
-- Users read/insert/update ONLY their own row, and CANNOT change their own
-- role or tags (that would be a privilege-escalation vector — the anon key is
-- public). Admins can read/update everyone.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid() and (role is null or role = 'user'));
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and not (role is distinct from (select p.role from public.profiles p where p.id = auth.uid()))
    and not (tags is distinct from (select p.tags from public.profiles p where p.id = auth.uid()))
  );
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin());

-- products / modules / lessons -------------------------------------------------
-- Students see only what they've been granted (via user_product_access);
-- preview lessons are visible to anyone. Admins do everything.
create policy products_admin_all on public.products
  for all using (public.is_admin());
create policy products_select on public.products
  for select using (
    id in (select product_id from public.user_product_access where user_id = auth.uid())
    or public.is_admin()
  );

create policy modules_admin_all on public.modules
  for all using (public.is_admin());
create policy modules_select on public.modules
  for select using (
    product_id in (select product_id from public.user_product_access where user_id = auth.uid())
    or public.is_admin()
  );

create policy lessons_admin_all on public.lessons
  for all using (public.is_admin());
create policy lessons_select on public.lessons
  for select using (
    is_preview = true
    or module_id in (
      select m.id from public.modules m
      where m.product_id in (
        select product_id from public.user_product_access where user_id = auth.uid()
      )
    )
    or public.is_admin()
  );

-- user_product_access ----------------------------------------------------------
create policy user_product_access_admin_all on public.user_product_access
  for all using (public.is_admin());
create policy user_product_access_select_own on public.user_product_access
  for select using (user_id = auth.uid());

-- lesson_completions -----------------------------------------------------------
create policy completions_insert_own on public.lesson_completions
  for insert with check (user_id = auth.uid());
create policy completions_select on public.lesson_completions
  for select using (user_id = auth.uid() or public.is_admin());

-- activity_logs ----------------------------------------------------------------
create policy activity_logs_insert_auth on public.activity_logs
  for insert with check (auth.uid() is not null);
create policy activity_logs_select on public.activity_logs
  for select using (user_id = auth.uid() or public.is_admin());

-- site_settings ----------------------------------------------------------------
create policy site_settings_read on public.site_settings
  for select using (auth.uid() is not null);
create policy site_settings_admin_all on public.site_settings
  for all using (public.is_admin());

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Public-read bucket for lesson downloads/images. 50MB cap. Only admins write.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-content', 'lesson-content', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

create policy lesson_content_public_read on storage.objects
  for select using (bucket_id = 'lesson-content');
create policy lesson_content_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'lesson-content' and public.is_admin());
create policy lesson_content_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'lesson-content' and public.is_admin());
create policy lesson_content_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'lesson-content' and public.is_admin());

-- ── Auth trigger ──────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── First admin (run AFTER the person has signed up once) ─────────────────────
-- update public.profiles set role = 'admin' where email = 'owner@clientdomain.com';
