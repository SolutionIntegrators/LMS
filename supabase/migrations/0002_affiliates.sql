-- Affiliate tracking links: /r/<code> logs a click and redirects to the
-- affiliate's destination URL. commission_rate stored now for a future
-- sale-attribution upgrade.
create table if not exists public.affiliates (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  email           text,
  destination_url text not null,
  commission_rate numeric default 0,
  is_active       boolean not null default true,
  created_at      timestamptz default now()
);

create table if not exists public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referer      text,
  user_agent   text,
  created_at   timestamptz default now()
);

alter table public.affiliates enable row level security;
alter table public.affiliate_clicks enable row level security;

-- Admin-only via the app; the public /r/ route uses the service role.
create policy affiliates_admin_all on public.affiliates
  for all using (public.is_admin());
create policy affiliate_clicks_admin_select on public.affiliate_clicks
  for select using (public.is_admin());
