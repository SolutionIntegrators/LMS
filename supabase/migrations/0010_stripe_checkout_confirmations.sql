-- Per-session sale snapshot so the client-side thank-you page can read the
-- purchase (amount/product) by session_id without a Stripe key. Also tracks
-- whether the browser recorded it (client_confirmed_at) so the server-side GA4
-- fallback only fires for sales the browser missed (closed tab).
create table if not exists public.stripe_checkout_confirmations (
  session_id          text primary key,          -- Stripe Checkout Session id (cs_...)
  transaction_ref     text,                       -- payment_intent (pi_...) for GA transaction_id
  amount              numeric,
  currency            text,
  product_title       text,
  buyer_email         text,
  client_confirmed_at timestamptz,                -- set when the thank-you page reads it
  server_sent_at      timestamptz,                -- set when the GA4 fallback fired
  created_at          timestamptz not null default now()
);

-- Server-only table (service role in webhook/endpoint/cron). Lock out anon/auth.
alter table public.stripe_checkout_confirmations enable row level security;
