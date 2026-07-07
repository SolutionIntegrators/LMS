# Client Portal — Setup & Clone Runbook

This app is a **single-tenant client learning portal**. Each client gets their
own isolated copy: their own Supabase project, their own Cloudflare Pages
deployment, their own domain. This document is the checklist to stand up a new
one from scratch. Budget ~half a day the first few times, faster after.

> **Ownership rule:** the *client* owns every account that holds their data or
> bills them (Supabase, domain registrar, Stripe/Dubsado, Kit, Bunny). *You* own
> the codebase and the deploy know-how. Set accounts up under their email, add
> yourself as a member. This keeps you clear of their PII/billing and lets them
> keep everything if they ever leave.

---

## Infrastructure bill of materials (per client)

| Layer | Service | Purpose | ~Cost |
|---|---|---|---|
| Hosting/CDN | Cloudflare Pages | Runs the Next.js app at the edge | free–$5/mo |
| DB + Auth + Storage | Supabase | Content, logins, file uploads | free–$25/mo |
| Transactional email | Resend (SMTP + API) | Auth emails + "new access"/affiliate emails | free–$20/mo |
| Domain + DNS | Registrar + DNS | `portal.clientdomain.com` + email DNS | ~$12/yr |
| Commerce | Dubsado (via Zapier) + Stripe | Purchase → auto-grant access | client's cart |
| Email marketing (optional) | Kit (ConvertKit) | Tag buyers on purchase | client's plan |
| Ops hubs (optional) | Airtable | Sales + affiliate/partner dashboards | free–$20/mo |
| Video (optional) | Bunny Stream | Lesson + welcome videos | ~$5/mo |

---

## What's reusable vs. per-client

- **Reusable IP (this repo):** all app code, the `supabase/migrations/` set
  (schema + RLS + `is_admin()` + storage + affiliate/kit/announcement tables),
  the purchase + affiliate logic, this runbook.
- **Per-client (recreated each time):** Supabase project, all env vars/secrets,
  domain + DNS, email verification, webhook secrets, and branding
  (`lib/branding.ts` + color tokens + `/public` logos).

---

## Phase A — Provision accounts

1. **Supabase** → new project. Save the DB password. From **Settings → API** copy:
   `Project URL`, `anon` key, `service_role` key.
2. **Cloudflare** → **Workers & Pages** → create a Pages project (connect the repo
   or plan to deploy via Wrangler).
3. **Resend** → add the client's sending domain (or a subdomain like
   `mail.clientdomain.com`). Create a **sending-only** API key.
4. Confirm the client's **domain**, **Dubsado + Stripe**, and (optional) **Kit**
   / **Bunny** accounts exist.

## Phase B — Database & security  ⚠️ never hand-click this

5. Open the Supabase **SQL Editor** and run **every file in
   `supabase/migrations/` in numeric order** (`0001_init.sql` first — tables,
   RLS, `is_admin()`, `handle_new_user()`, storage bucket, auth trigger — then
   `0002`…`0008` which add categories, announcements, Kit tag, sales-page URL,
   the affiliate tables, and revenue-share tables, and retire ThriveCart).
   *(Doing RLS by hand is how privilege-escalation bugs get shipped — always run the migrations.)*
6. Sanity check: `select tablename from pg_policies where schemaname='public';`
   — every app table should have policies.

## Phase C — Configure

7. **Env vars** — set in Cloudflare Pages (**Settings → Environment variables**)
   and in a local `.env.local` for dev. See `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ZAPIER_WEBHOOK_SECRET` (invent a long random string) — Dubsado→Zapier
   - `STRIPE_WEBHOOK_SECRET` (`whsec_…` from the Stripe webhook endpoint, Phase C.9)
   - Optional: `AIRTABLE_TOKEN`, `RESEND_API_KEY` (+ `EMAIL_FROM`), `KIT_API_KEY`,
     `CRON_SECRET`, `AFFILIATE_LINK_SECRET`
8. **Email (custom SMTP)** — Supabase **Authentication → Emails → SMTP Settings**:
   host `smtp.resend.com`, port `465`, user `resend`, password = the Resend key,
   sender = `connect@clientdomain.com`. Add the DKIM/SPF/MX records Resend gives
   you to the client's DNS and wait for `verified`.
   - Also set **Authentication → URL Configuration → Site URL** to the portal domain
     and add `https://portal.clientdomain.com/auth/callback` to the redirect allow-list.
9. **Purchase webhooks** — both grant access via the shared pipeline:
   - **Dubsado → Zapier:** Zap POSTs to
     `https://portal.clientdomain.com/api/webhooks/zapier` with header
     `x-api-key: <ZAPIER_WEBHOOK_SECRET>` and `{ email, product_slug, amount?, … }`.
   - **Stripe:** create a webhook endpoint (Dashboard → Developers → Webhooks /
     Event Destinations, scope "Your account", event `checkout.session.completed`)
     → `https://portal.clientdomain.com/api/webhooks/stripe`; copy its `whsec_…`
     into `STRIPE_WEBHOOK_SECRET`. Stripe Products/Payment Links must carry
     `metadata.lms_slug = <product slug>`; the webhook only grants for links that
     have it (Dubsado charges/invoices in the same account are ignored).

## Phase D — Brand & seed

10. **`lib/branding.ts`** — edit every field: company name, titles, taglines,
    welcome heading/photo/video, product noun ("Goodie"/"Course"/…), and all links.
11. **Colors** — edit the `:root` tokens in `app/globals.css` (`--si-*`).
12. **Logos** — replace the images in `/public` (nav badge + login logo) and point
    `branding.logo.*` at them.
13. **First admin** — have the owner sign up once (magic link), then run:
    `update public.profiles set role='admin' where email='owner@clientdomain.com';`
14. Seed products/categories from the admin UI (`/admin/content`).

## Phase E — Launch

15. **Deploy:** `npx @cloudflare/next-on-pages && npx wrangler pages deploy .vercel/output/static --project-name=<pages-project>`
16. **Custom domain:** add it in Cloudflare Pages; CNAME `portal` → `<project>.pages.dev`.
17. **Smoke test (do all of these live):** magic-link sign-in, password reset,
    a test purchase → access granted, open a video lesson, a download opens in a
    new tab, mobile layout, admin can add/edit a product.
18. Hand off `docs/ADMIN-GUIDE.md`.

---

## Deploy command (reference)

```bash
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name=<pages-project>
```

## Data model (what the migrations create)

Core: `profiles` (role + tags = authorization) · `products` → `modules` →
`lessons` (content_blocks JSON) · `user_product_access` (who sees what; written
by the webhooks, stores amount) · `lesson_completions` · `activity_logs` ·
`site_settings`. Affiliate/commerce: `affiliates` + `affiliate_links` +
`affiliate_clicks` (tracking links & clicks) · `referral_attributions` (sale
attribution) · `product_revenue_shares` + `revenue_share_payouts` (rev-share
partnerships). Products also carry `category`, `announcement_active/text`,
`kit_tag_id`, `sales_page_url`, `auto_grant_tags`.

All access is enforced by RLS keyed on `is_admin()` and `user_product_access` —
the anon key is public, so the database is the security boundary, not the app.

See **[docs/AFFILIATE-SOP.md](docs/AFFILIATE-SOP.md)** for the affiliate program
and **[docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)** for day-to-day operation.
