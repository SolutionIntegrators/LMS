# SI Goodies Shop LMS

The Solution Integrators learning portal — students access purchased digital
products (courses, templates, workshops) at
**https://goodies.solutionintegrators.us**.

Next.js 15 (App Router, edge runtime) on **Cloudflare Pages**, with
**Supabase** (Postgres + Auth + Storage). Purchases flow in via ThriveCart /
Zapier webhooks and are mirrored to an Airtable reporting hub. Auth emails are
branded and sent from connect@solutionintegrators.us via Resend.

## Documentation

- **[docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)** — admin SOPs: products,
  content, tags/gating, users & invites, purchases, monitoring, plus an
  ops/architecture quick reference.
- **[docs/EMAIL.md](docs/EMAIL.md)** — email/Resend setup, templates,
  troubleshooting.
- **[docs/email-templates/](docs/email-templates/)** — branded auth email
  HTML (source of truth; pasted into Supabase dashboard).

## Development

```bash
npm install
npx next dev            # local dev against the same Supabase project (.env.local)
```

`.env.local` (gitignored) holds NEXT_PUBLIC_SUPABASE_URL / ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, THRIVECART_WEBHOOK_SECRET, AIRTABLE_TOKEN.

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
