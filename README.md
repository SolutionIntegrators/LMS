# SI Goodies Shop LMS

The Solution Integrators learning portal — students access purchased digital
products (courses, templates, workshops) at
**https://goodies.solutionintegrators.us**.

Next.js 15 (App Router, edge runtime) on **Cloudflare Pages**, with
**Supabase** (Postgres + Auth + Storage). Purchases flow in via **Dubsado
(Zapier)** and **Stripe** payment links — both grant portal access through one
shared pipeline that also tags buyers in **Kit**, runs the **affiliate program**
(attribution + revenue-share), and mirrors sales to **Airtable**. Auth emails are
branded and sent from connect@solutionintegrators.us via Resend. (ThriveCart is
retired.)

## Documentation

- **[docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)** — admin SOPs: products,
  content, tags/gating, users, Dubsado + Stripe purchases, Kit tagging,
  announcements, monitoring, plus an ops/architecture reference.
- **[docs/AFFILIATE-SOP.md](docs/AFFILIATE-SOP.md)** — the affiliate program:
  affiliates, per-product links, self-service requests, attribution, revenue-
  share, payouts.
- **[docs/EMAIL.md](docs/EMAIL.md)** — email/Resend setup, templates,
  troubleshooting.
- **[docs/email-templates/](docs/email-templates/)** — branded auth email HTML.
- **[.env.example](.env.example)** — all env vars/secrets the app uses.
- **[supabase/migrations/](supabase/migrations/)** — the schema (run in order).

## Development

```bash
npm install
npx next dev            # local dev against the same Supabase project (.env.local)
```

`.env.local` (gitignored) holds the secrets — see [.env.example](.env.example)
for the full list (Supabase keys, ZAPIER_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET,
AIRTABLE_TOKEN, RESEND_API_KEY, KIT_API_KEY, CRON_SECRET, AFFILIATE_LINK_SECRET).

## Deploy

```bash
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name=lms
```

### Edge-runtime rules (Cloudflare Pages)

- Do **not** use `redirect()` / `notFound()` from next/navigation in render
  paths — they throw into the error boundary on CF Pages. Use middleware
  redirects or client-side navigation.
- No event handlers on elements inside Server Components — extract a
  `'use client'` component.
- New Cloudflare secrets only appear after the **next deploy**.
