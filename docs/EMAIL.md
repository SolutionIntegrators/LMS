# Email Setup (Resend + Supabase Auth)

All auth emails (magic link, invite, confirm signup, password reset) are sent
**from `connect@solutionintegrators.us`** via [Resend](https://resend.com),
wired into Supabase Auth as a custom SMTP provider.

## How it works

```
Student requests magic link on goodies.solutionintegrators.us
        │
        ▼
Supabase Auth renders the branded template (configured in dashboard)
        │
        ▼
Supabase sends via custom SMTP → smtp.resend.com (authenticated by API key)
        │
        ▼
Resend delivers, DKIM-signed for solutionintegrators.us
        │
        ▼
Inbox shows:  Solution Integrators <connect@solutionintegrators.us>
```

Replies go to the normal `connect@` Google Workspace inbox — Resend only
sends; it does not receive mail and does not affect Gmail/Zoho.

## Accounts & keys

- **Resend account**: created with GitHub login (connect@solutionintegrators.us).
- **Sending domain**: `solutionintegrators.us`, region `us-east-1`,
  domain id `e1403556-5ad9-4ba9-adfc-88e6de2d9c86`.
- **API keys** (never commit these):
  - A **"Sending access"-only key** is used as the SMTP password in Supabase.
    Least privilege: it can send email, nothing else.
  - A full-access key was used once to register the domain and can be (was)
    deleted afterward. If domain settings ever need changing, create a new
    full-access key temporarily.

## DNS records (Cloudflare → solutionintegrators.us)

| Type | Name | Content | Priority |
|------|------|---------|----------|
| TXT | `resend._domainkey` | `p=MIGf…` (DKIM public key from Resend dashboard) | — |
| MX  | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

These live on subdomains (`send.`, `resend._domainkey.`) so they don't
interact with the root SPF (Google + Zoho) or the Google MX records.

## Supabase configuration (dashboard)

**Project Settings → Authentication → SMTP Settings** (custom SMTP enabled):

| Field | Value |
|-------|-------|
| Sender email | `connect@solutionintegrators.us` |
| Sender name | `Solution Integrators` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the sending-only Resend API key |

**Authentication → URL Configuration**:
- Site URL: `https://goodies.solutionintegrators.us`
- Redirect URLs must include `https://goodies.solutionintegrators.us/**`
  (without this, magic links strip the `/auth/callback` path and users land
  on the login page signed out).

**Authentication → Email Templates** — the branded HTML lives in this repo
under [`docs/email-templates/`](email-templates/) and is pasted into the
matching dashboard slots:

| Repo file | Supabase template slot |
|-----------|------------------------|
| `magic-link.html` | Magic Link |
| `invite.html` | Invite user |
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset Password |
| `password-changed.html` | Password Changed (if the slot exists on the plan) |

Treat the repo files as the source of truth: edit here first, then re-paste
into the dashboard, so the templates stay versioned.

## Why custom SMTP (not Supabase's default sender)

- Supabase's built-in sender is rate-limited to a handful of emails per hour
  and sends from `noreply@mail.app.supabase.io` — unbranded and easily
  throttled during onboarding.
- Resend free tier: 3,000 emails/month, 100/day — plenty for the LMS.

## Troubleshooting

- **"Student never got the magic link"** → Resend dashboard → **Logs** shows
  every send with delivered/bounced status. If nothing appears there,
  Supabase never handed it off — check SMTP settings/key validity.
- **Magic link lands on login page, signed out** → the redirect URL
  allow-list is missing `https://goodies.solutionintegrators.us/**`.
- **Domain shows "not verified" in Resend** → re-check the three DNS records
  (values must match exactly; they're in Resend → Domains).
- **Emails in spam** → confirm the domain is Verified in Resend (DKIM), and
  consider adding a DMARC record (`_dmarc` TXT: `v=DMARC1; p=none;`) if not
  already present.
