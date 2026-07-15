-- Products can grant access to OTHER products on purchase (e.g. a bundle SKU
-- that unlocks the main course too). One level only; the purchase pipeline does
-- not recurse into a linked product's own grant list.
alter table public.products
  add column if not exists grant_product_ids uuid[] not null default '{}';
