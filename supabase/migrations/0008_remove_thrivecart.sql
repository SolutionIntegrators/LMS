-- Retire ThriveCart: payments now flow via Dubsado (Zapier) and Stripe only.
alter table public.products drop column if exists thrivecart_product_id;
