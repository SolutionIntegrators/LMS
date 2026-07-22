-- Product upsell / "You may also be interested in" recommendations.
-- Lets each product recommend other products (shown as locked cards on the
-- dashboard to buyers who don't own them yet), with a per-product CTA that opens
-- the target's sales page / checkout in a new tab or in an in-app lightbox.

-- Explicit, owner-chosen recommendations for owners of THIS product.
alter table public.products add column if not exists recommended_product_ids uuid[] default '{}';

-- Also surface other active products in the same category (covers "recommend
-- the other Airtable templates").
alter table public.products add column if not exists recommend_same_category boolean default false;

-- CTA config used when THIS product is shown as a recommendation. sales_page_url
-- (migration 0006) is the default destination; checkout_url overrides it when set.
alter table public.products add column if not exists checkout_url text;
alter table public.products add column if not exists upsell_cta_mode text default 'new_tab'
  check (upsell_cta_mode in ('new_tab', 'lightbox'));
alter table public.products add column if not exists upsell_cta_label text default 'Unlock →';
