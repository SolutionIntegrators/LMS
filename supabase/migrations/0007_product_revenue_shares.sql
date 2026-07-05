-- Revenue-share partnerships: a partner earns a % on EVERY sale of a product
-- (or a named add-on), independent of referral/click attribution.
create table if not exists public.product_revenue_shares (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references public.products(id) on delete cascade,
  label         text,
  partner_email text not null,
  partner_name  text,
  rate          numeric not null default 0,
  created_at    timestamptz default now()
);

create table if not exists public.revenue_share_payouts (
  id               uuid primary key default gen_random_uuid(),
  revenue_share_id uuid references public.product_revenue_shares(id) on delete cascade,
  transaction_ref  text,
  buyer_email      text,
  amount           numeric,
  commission       numeric,
  created_at       timestamptz default now(),
  unique (revenue_share_id, transaction_ref)
);

alter table public.product_revenue_shares enable row level security;
alter table public.revenue_share_payouts enable row level security;
create policy prs_admin_all on public.product_revenue_shares for all using (public.is_admin());
create policy rsp_admin_all on public.revenue_share_payouts for all using (public.is_admin());
