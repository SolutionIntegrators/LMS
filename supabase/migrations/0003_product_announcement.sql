-- Per-product announcement bar: shows on the product page for anyone who owns
-- the product. Toggled + edited from the admin product settings.
alter table public.products add column if not exists announcement_active boolean not null default false;
alter table public.products add column if not exists announcement_text text;
