-- Affiliates become people; tracking links become per-product, enabling one
-- partner to promote multiple products and enabling automatic sale attribution.
alter table public.affiliates drop column if exists code;
alter table public.affiliates drop column if exists destination_url;
-- commission_rate (numeric) is a percentage, e.g. 20 = 20%.

create table if not exists public.affiliate_links (
  id              uuid primary key default gen_random_uuid(),
  affiliate_id    uuid not null references public.affiliates(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  code            text not null unique,
  destination_url text not null,
  is_active       boolean not null default true,
  created_at      timestamptz default now()
);

alter table public.affiliate_clicks drop column if exists affiliate_id;
alter table public.affiliate_clicks add column if not exists link_id uuid references public.affiliate_links(id) on delete cascade;

alter table public.user_product_access add column if not exists amount numeric;

create table if not exists public.referral_attributions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  affiliate_id      uuid not null references public.affiliates(id) on delete cascade,
  link_id           uuid references public.affiliate_links(id) on delete set null,
  product_id        uuid references public.products(id) on delete set null,
  code              text,
  sale_amount       numeric,
  commission_amount numeric,
  converted_at      timestamptz,
  created_at        timestamptz default now(),
  unique (user_id, product_id)
);

alter table public.affiliate_links enable row level security;
alter table public.referral_attributions enable row level security;
create policy affiliate_links_admin_all on public.affiliate_links for all using (public.is_admin());
create policy referral_attributions_admin_all on public.referral_attributions for all using (public.is_admin());
