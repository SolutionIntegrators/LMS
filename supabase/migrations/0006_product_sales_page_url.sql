-- Public sales-page URL an affiliate link redirects to. Setting it also marks
-- the product as affiliate-eligible for self-service link requests.
alter table public.products add column if not exists sales_page_url text;
