-- Follow-up fixes from code review of 0013_community.sql.

-- has_active_community_access() didn't check products.is_active, so deactivating
-- a product left existing buyers with live community access when the server
-- actions were called directly (the UI only hid the entry point).
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
      and upa.granted_at + (p.community_access_months || ' months')::interval > now()
  )
$$;

-- granted_at was nullable with no constraint; a NULL row would be treated as
-- permanently expired by has_active_community_access() with no diagnostic.
-- Safe to enforce now — no existing rows have a null granted_at.
alter table public.user_product_access alter column granted_at set not null;
