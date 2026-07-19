-- Traffic attribution captured client-side on the thank-you page (for record /
-- debug; also mirrored onto the Airtable Sales row).
alter table public.stripe_checkout_confirmations
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text;
