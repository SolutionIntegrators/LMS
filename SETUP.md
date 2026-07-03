# Client Portal — Setup & Clone Runbook

This app is a **single-tenant client learning portal**. Each client gets their
own isolated copy: their own Supabase project, their own Cloudflare Pages
deployment, their own domain. This document is the checklist to stand up a new
one from scratch. Budget ~half a day the first few times, faster after.

> **Ownership rule:** the *client* owns every account that holds their data or
> bills them (Supabase, domain registrar, ThriveCart, Bunny). *You* own the
> codebase and the deploy know-how. Set accounts up under their email, add
> yourself as a member. This keeps you clear of their PII/billing and lets them
> keep everything if they ever leave.

---

## Infrastructure bill of materials (per client)

| Layer | Service | Purpose | ~Cost |
|---|---|---|---|
| Hosting/CDN | Cloudflare Pages | Runs the Next.js app at the edge | free–$5/mo |
| DB + Auth + Storage | Supabase | Content, logins, file uploads | free–$25/mo |
| Transactional email | Resend (SMTP) | Branded magic-link / reset emails | free–$20/mo |
| Domain + DNS | Registrar + DNS | `portal.clientdomain.com` + email DNS | ~$12/yr |
| Commerce | ThriveCart / Stripe / Zapier | Purchase → auto-grant access | client's cart |
| Ops hub (optional) | Airtable | Customer/sales dashboard | free–$20/mo |
| Video (optional) | Bunny Stream | Lesson + welcome videos | ~$5/mo |

---

## What's reusable vs. per-client

- **Reusable IP (this repo):** all app code, `supabase/migrations/0001_init.sql`
  (schema + RLS + `is_admin()` + storage), the purchase-webhook logic, this runbook.
- **Per-client (recreated each time):** Supabase project, all env vars/secrets,
  domain + DNS, email verification, webhook secret, and branding
  (`lib/branding.ts` + color tokens + `/public` logos).

---

## Phase A — Provision accounts

1. **Supabase** → new project. Save the DB password. From **Settings → API** copy:
   `Project URL`, `anon` key, `service_role` key.
2. **Cloudflare** → **Workers & Pages** → create a Pages project (connect the repo
   or plan to deploy via Wrangler).
3. **Resend** → add the client's sending domain (or a subdomain like
   `mail.clientdomain.com`). Create a **sending-only** API key.
4. Confirm the client's **domain**, **cart** (ThriveCart), and **Bunny** library exist.

## Phase B — Database & security  ⚠️ never hand-click this

5. Open the Supabase **SQL Editor** and run **`supabase/migrations/0001_init.sql`**
   verbatim. This creates all tables, RLS policies, `is_admin()`,
   `handle_new_user()`, the `lesson-content` storage bucket, and the auth trigger.
   *(Doing RLS by hand is how privilege-escalation bugs get shipped — always run the migration.)*
6. Sanity check: `select * from pg_policies where schemaname='public';` — you
   should see policies on all 8 tables.

## Phase C — Configure

7. **Env vars** — set in Cloudflare Pages (**Settings → Environment variables**)
   and in a local `.env.local` for dev. See `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `THRIVECART_WEBHOOK_SECRET` (invent a long random string)
   - `ZAPIER_WEBHOOK_SECRET` (optional), `AIRTABLE_TOKEN` (optional)
8. **Email (custom SMTP)** — Supabase **Authentication → Emails → SMTP Settings**:
   host `smtp.resend.com`, port `465`, user `resend`, password = the Resend key,
   sender = `connect@clientdomain.com`. Add the DKIM/SPF/MX records Resend gives
   you to the client's DNS and wait for `verified`.
   - Also set **Authentication → URL Configuration → Site URL** to the portal domain
     and add `https://portal.clientdomain.com/auth/callback` to the redirect allow-list.
9. **Purchase webhook** — in ThriveCart, point the webhook at
   `https://portal.clientdomain.com/api/webhooks/thrivecart?key=THRIVECART_WEBHOOK_SECRET`.
   The endpoint is fail-closed: no matching `key` (or valid HMAC) → 401.
   Map each ThriveCart product ID to a portal product (`products.thrivecart_product_id`)
   and optionally to auto-granted `tags`.

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

## Data model (what the migration creates)

`profiles` (role + tags = authorization) · `products` → `modules` → `lessons`
(content_blocks JSON) · `user_product_access` (who sees what; written by the
webhook) · `lesson_completions` (progress) · `activity_logs` (analytics) ·
`site_settings` (announcement banner). All access is enforced by RLS keyed on
`is_admin()` and `user_product_access` — the anon key is public, so the database
is the security boundary, not the app.
