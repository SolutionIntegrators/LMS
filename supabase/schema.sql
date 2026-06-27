-- ============================================================
-- Solution Integrators LMS — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. profiles
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  email           text not null,
  full_name       text,
  role            text default 'user' check (role in ('user', 'admin')),
  created_at      timestamptz default now(),
  last_login_at   timestamptz
);

-- 2. products
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique not null,
  description     text,
  cover_image_url text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- 3. modules
create table if not exists public.modules (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references public.products(id) on delete cascade,
  title           text not null,
  description     text,
  sort_order      integer not null,
  created_at      timestamptz default now()
);

-- 4. lessons
create table if not exists public.lessons (
  id              uuid primary key default gen_random_uuid(),
  module_id       uuid references public.modules(id) on delete cascade,
  title           text not null,
  description     text,
  content_type    text check (content_type in ('video', 'pdf', 'download', 'text', 'embed')),
  content_url     text,
  sort_order      integer not null,
  is_preview      boolean default false,
  created_at      timestamptz default now()
);

-- 5. user_product_access
create table if not exists public.user_product_access (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  product_id      uuid references public.products(id) on delete cascade,
  granted_at      timestamptz default now(),
  granted_by      text,
  transaction_ref text,
  unique (user_id, product_id)
);

-- 6. activity_logs
create table if not exists public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  event_type      text not null,
  product_id      uuid references public.products(id),
  module_id       uuid references public.modules(id),
  lesson_id       uuid references public.lessons(id),
  metadata        jsonb,
  created_at      timestamptz default now()
);

-- 7. lesson_completions
create table if not exists public.lesson_completions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  lesson_id       uuid references public.lessons(id) on delete cascade,
  completed_at    timestamptz default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.user_product_access enable row level security;
alter table public.activity_logs enable row level security;
alter table public.lesson_completions enable row level security;

-- profiles: users can read/update their own; admins can read all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Service role can insert profiles (used by auth trigger / webhook)
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);

-- products: users can read products they have access to; admins read all
create policy "Users can read their accessible products"
  on public.products for select
  using (
    exists (
      select 1 from public.user_product_access upa
      where upa.product_id = id and upa.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- modules: same access pattern as products
create policy "Users can read modules for accessible products"
  on public.modules for select
  using (
    exists (
      select 1 from public.user_product_access upa
      where upa.product_id = product_id and upa.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage modules"
  on public.modules for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- lessons: same access pattern
create policy "Users can read lessons for accessible modules"
  on public.lessons for select
  using (
    exists (
      select 1 from public.modules m
      join public.user_product_access upa on upa.product_id = m.product_id
      where m.id = module_id and upa.user_id = auth.uid()
    )
    or is_preview = true
    or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- user_product_access: users can read their own; only service role inserts
create policy "Users can read own access"
  on public.user_product_access for select
  using (user_id = auth.uid());

create policy "Admins can read all access"
  on public.user_product_access for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage access"
  on public.user_product_access for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- activity_logs: users can insert their own; admins read all
create policy "Users can insert own activity logs"
  on public.activity_logs for insert
  with check (user_id = auth.uid());

create policy "Users can read own activity logs"
  on public.activity_logs for select
  using (user_id = auth.uid());

create policy "Admins can read all activity logs"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- lesson_completions: users can insert/read their own; admins read all
create policy "Users can insert own completions"
  on public.lesson_completions for insert
  with check (user_id = auth.uid());

create policy "Users can read own completions"
  on public.lesson_completions for select
  using (user_id = auth.uid());

create policy "Admins can read all completions"
  on public.lesson_completions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- Auto-create profile on signup (trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
