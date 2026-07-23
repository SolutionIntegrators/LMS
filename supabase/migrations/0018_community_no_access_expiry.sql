-- Remove the time-limited community access window. Community access now
-- lasts exactly as long as product ownership does (same as any other
-- lesson) — no separate months-based decay from the purchase date.

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
      and p.is_active
  )
$$;

alter table public.products drop column if exists community_access_months;
