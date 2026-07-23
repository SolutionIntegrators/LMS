# SI Goodies Shop — Admin Guide & SOPs

The LMS lives at **https://goodies.solutionintegrators.us**. Sign in with an
admin account, then use the **Admin** link in the top nav. Admin sections:
**Content · Users · Affiliates · Activity Logs · Settings**.

Affiliate program specifics live in **[AFFILIATE-SOP.md](AFFILIATE-SOP.md)**;
email setup in **[EMAIL.md](EMAIL.md)**.

---

## SOP 1 — Create & configure a product

1. **Admin → Content → Add Product**: Title + optional Category → **Add
   Product**. New products start **inactive** (invisible to students).
2. Click **Edit →** to open its settings:
   - **Description**, **Category**, **Thumbnail** (URL or brand color).
   - **Auto-grant tags on purchase** (comma-separated — added to the buyer's
     profile on purchase; see SOP 5).
   - **Kit tag on purchase** — dropdown of your Kit tags; buyers are tagged in
     Kit automatically (see SOP 7).
   - **Sales page URL** — the public sales page. Setting it makes the product
     **affiliate-eligible** and is where its affiliate links redirect (see the
     Affiliate SOP).
   - **Announcement bar** — a checkbox + message shown on this product's page to
     everyone who owns it (see SOP 8).
   - **Active** checkbox: tick when ready for students.
   - **Product URL** — the slug is editable. Type a new one (letters, numbers,
     dashes) and Save; you're redirected to the new URL. Must be unique.
3. **Categories:** the Content page groups products by category. To change a
   product's category, edit it (or use the quick "Move to category" control on
   the products list).
4. **Duplicate:** the products list has a **Duplicate** button (full copy incl.
   modules + lessons, saved inactive). Modules and lessons have their own
   Duplicate buttons too.
5. **Delete product** removes it and its modules/lessons. Activity-log history
   is preserved.

## SOP 2 — Build content (modules, lessons, elements)

1. On the product's edit page, **Add Module**. Each module row: rename,
   thumbnail, **Required tag** (SOP 5), reorder (↑/↓), **Duplicate**, delete.
2. **+ Add Lesson**, then **Edit** the lesson:
   - **Content type:** Video (embed URL), Embed (Airtable/Notion/forms — auto-
     sizes), PDF, Text, or Download. Downloads open in a new tab. Files/images
     upload directly (Supabase Storage).
   - **Content elements:** block builder below the media — Button, Heading,
     Text, Bullets, Image, Divider, HTML. Text/Bullets support inline markdown
     (`[label](https://url)`, `**bold**`, `*italic*`) and lines starting with
     `- ` render as bullets.
   - **Access Control:** Published toggle (drafts admin-only), Free preview,
     Required tag.
   - **Duplicate** the lesson (copies as a draft).

## SOP 3 — Preview as a student

On a product's edit page click **👁 Preview as student ↗**. Opens the real
student view (orange banner), works on drafts, doesn't pollute analytics.

## SOP 4 — Add a user / manage access

**Admin → Users**:
- **Add a user:** email + name + optional product → **Add + send invite**
  (creates the account, sends the branded invite, grants the product).
- **Grant more products:** the "+ Grant…" dropdown in their row. **Revoke:** ✕.
- **Name / Tags:** inline edit + Save.
- Users can also self-serve a magic-link login, then you grant products.

## SOP 5 — Tags (gating + auto-grant)

Tags live on the user's profile (Users page → Tags, lowercase, comma-separated).
- **Gate a module/lesson:** set its "Required tag" → hidden from users without it.
- **Auto-grant on purchase:** a product's "Auto-grant tags" are added to buyers
  automatically, unlocking any content gated by those tags.

## SOP 6 — Purchases → automatic access (Dubsado + Stripe)

**Payment is taken via Dubsado or Stripe.** Both grant portal access
automatically through one shared pipeline (find/invite the buyer, grant the
product, store the amount, apply tags, tag in Kit, run affiliate attribution +
revenue-share, email the buyer, mirror the sale to Airtable). Best-effort side
effects never block the grant.

- **Dubsado → Zapier:** in the Zap, POST to `/api/webhooks/zapier` with header
  `x-api-key: <ZAPIER_WEBHOOK_SECRET>` and JSON:
  `{ email, product_slug, full_name?, transaction_ref?, amount?, tags?, product_name?, kit_tag_id? }`.
  Use `tags` (no product) for tag-only add-ons (e.g. `lumebundle`).
- **Stripe:** the Payment Links (backup checkout, SOP 9) fire the Stripe webhook
  at `/api/webhooks/stripe` (signature-verified). It grants **only** for our
  payment links (guarded on `payment_link` + `metadata.lms_slug`) — Dubsado
  charges / invoices in the same Stripe account never trigger it.

New buyers get a branded invite; existing customers get a "you now have access
to X" email; Kit-tagging and affiliate/revenue-share payouts run automatically.

## SOP 7 — Kit (email marketing) tagging

Each product's **Kit tag on purchase** (product settings) is applied to the
buyer in Kit on every purchase (via both payment paths). Needs `KIT_API_KEY`.
Keep the product's Kit tag mapping in sync as you add products.

## SOP 8 — Announcements

- **Site-wide:** Admin → Settings → announcement bar text + toggle (burnt-orange
  bar on the dashboard for everyone).
- **Per-product:** each product's settings has its own announcement bar
  (sunset-yellow) shown only to owners of that product — e.g. notify Dubsado
  DIY owners about new materials without showing anyone else.

## SOP 9 — Stripe backup checkout

Live Stripe **Products + Payment Links** exist as a backup to Dubsado, priced
from the Money Metrics "Investment" column. Each link:
- carries `metadata.lms_slug` so the webhook grants the right product
- **requires the buyer's individual + business name** at checkout
- House of Lume / Sell Anything / Aurum links include an optional add-on

To make a NEW product sellable via Stripe: create the Stripe Product + Price +
Payment Link (with `metadata.lms_slug = <product slug>`), and the webhook grants
it automatically. (Ask me to script this from the Investment price.)

**Abandoned cart tracking:** the Stripe webhook also handles
`checkout.session.expired` (subscribe to it on the Stripe endpoint) → records a
row in the Backoffice **Abandoned Cart Metrics** table (product, amount, date,
name if captured; Source "Stripe"). Only payment-link sessions; ~24h delay
(Stripe's payment-link expiry). Metrics only — no auto Kit nurture.

**Email-deliverable products (no portal access):** for things fulfilled by
email (not the LMS), put a Kit tag id in the link's `metadata.kit_tag` and
**omit `lms_slug`**. On purchase the webhook just tags the buyer in Kit — no
portal account, no grant — and your Zapier/Kit automation handles delivery.
(e.g. "Diagnose Your Biz Systems" → tag "Goodies Shop | DYBS - Automated".)

## SOP 10 — Affiliates & revenue-share

Full detail in **[AFFILIATE-SOP.md](AFFILIATE-SOP.md)**. In short:
- **Admin → Affiliates:** add partners, per-product tracking links, see clicks +
  commission owed. Sales auto-attribute (referred buyer buys the linked product
  → login) and write payouts to the Backoffice hub.
- **"Become an affiliate"** nav link → your application form.
- **Self-service link requests** via the partner's Airtable interface.
- **Revenue-share partnerships** (e.g. Laura at 30% on set products/add-ons) are
  configured in the `product_revenue_shares` table and pay on every matching
  sale.

## SOP 11 — Support & monitoring

- **Support** nav link → ClickUp form.
- **Admin → Activity Logs:** logins, views, completions, purchases.
- **Airtable Hub:** sales/revenue reporting. **Backoffice Hub:** partner links,
  clicks, payouts. **Resend dashboard:** email delivery. **Stripe dashboard:**
  Stripe payments + the webhook delivery log.

## SOP 12 — Community discussion boards

A per-course discussion board, gated to buyers of that course for a limited
window after purchase (default 6 months — set per product).

- **Enable it:** on a product's lesson, set **Content Type → "Community
  discussion board"** (no URL needed). On the **product's** settings, set
  **Community access window (months)** (default 6) — this governs how long a
  buyer can read/post, counted from their `user_product_access.granted_at`.
  Once expired, the lesson shows "Your access to this community has expired"
  instead of the board (they keep the rest of the course).
- **Access model:** every buyer is subscribed to the whole course's community
  by default the moment they're granted access (no separate opt-in). Students
  mute individual threads from the thread view (🔔/🔕 toggle) to stop emails
  for just that one — everything else in the community still reaches them.
- **Notifications (via Resend, not Kit):**
  - **New thread** → you (admin, via `ADMIN_ALERT_EMAIL` or the from-address)
    always get an email, plus every subscribed/non-expired student.
  - **New reply** → subscribed, non-muted-on-that-thread, non-expired students
    (no separate admin email for replies).
  - **Weekly digest** ("This week in the community") → one email per
    subscribed, non-expired student, per course, for any course that had a new
    thread or reply in the last 7 days. This is a cron endpoint like the other
    three below — schedule it the same way, once a week:
    `GET /api/cron/community-digest?key=CRON_SECRET`.
- Threads/replies are RLS-gated the same way as everything else (see
  `has_active_community_access()` in `0013_community.sql`) — a student who
  never bought the course, or whose window lapsed, cannot read or post even by
  guessing a thread URL. Deactivating a product also revokes community access,
  even for buyers whose access row is still on file.
- **Formatting:** posts support the same lightweight markdown as lesson text
  blocks — `**bold**`, `*italic*`, `[label](https://url)`, and lines starting
  with `- ` become bullets (see `lib/markdown.ts`).
- **Reactions:** students can react to any thread or reply with a fixed set of
  emoji (👍 ❤️ 😂 🎉 🤔 👀 — see `lib/reactions.ts`). One reaction per emoji per
  person; clicking an already-picked emoji removes it.
- **Edit / delete:** the author of a thread or reply can edit or delete it at
  any time (deleting a thread also deletes its replies). Admins can always
  edit/delete anything via **Admin → Content**.
- **Pinning:** as an admin, open any thread and click **📌 Pin thread** to keep
  it at the top of the list (pinned threads always sort first). Click again
  to unpin. Only admins see the pin control; everyone sees a 📌 badge on
  pinned threads.

## SOP 13 — Student profile & avatars

Every student has a **My Profile** page (top-right avatar in the nav, next to
their email) where they can:
- Update their display **name**.
- Upload a **profile photo** (stored in the public `avatars` Supabase Storage
  bucket, one folder per user — see `0015_community_reactions_profile.sql`).
- Turn **community notifications on/off per course** they've bought (separate
  from per-thread mute, which only silences one thread) — this edits the same
  `community_subscriptions` row that's created automatically on purchase.

## Emails

See [EMAIL.md](EMAIL.md). Auth emails (invite / magic link / reset) send via
Supabase SMTP (Resend). Custom transactional emails — "new access granted" and
"your affiliate link is ready" — send via the Resend API (`RESEND_API_KEY`).

## Architecture / ops quick reference

| Thing | Where |
|---|---|
| Hosting | Cloudflare Pages, project `lms` (edge runtime) |
| Domain | goodies.solutionintegrators.us |
| Database + auth + storage | Supabase project `fgxivwspgczmzoztqyoy` |
| Deploy | `npx @cloudflare/next-on-pages && npx wrangler pages deploy .vercel/output/static --project-name=lms` |
| Secrets (CF Pages) | SUPABASE_SERVICE_ROLE_KEY, ZAPIER_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET, AIRTABLE_TOKEN, RESEND_API_KEY, KIT_API_KEY, GA4_MEASUREMENT_ID, GA4_API_SECRET, CRON_SECRET, AFFILIATE_LINK_SECRET |
| Analytics | GA4 — payment-link sales fire `purchase` + `shop_purchase`. Primary path is client-side (thank-you page `solutionintegrators.us/purchase-confirmed` via GTM `GTM-M4LNS9TQ`) so source/medium/campaign attribute; the webhook stashes each sale (stripe_checkout_confirmations) and a cron backstop `/api/cron/ga-fallback?key=CRON_SECRET` (every ~15 min) sends any the browser missed. The thank-you page also passes UTM source/medium/campaign to `/api/checkout-confirmation`, which mirrors them onto the Airtable Sales row (Traffic Source / Traffic Medium / Campaign). Dubsado sales ARE now in GA4 too — fired server-side from the Zapier webhook (purchase + shop_purchase, direct/unassigned since there's no browser session). |
| Repo | github.com/SolutionIntegrators/LMS (main) |
| Airtable sales hub | "SI Digital Product Hub" `appDiqNZWv2YPRYTE` |
| Airtable partner/payout hub | "Backoffice Management Hub" `appCDKeRL8J1xVmuO` |
| Payments | Dubsado→Zapier + Stripe (both → shared grant pipeline). ThriveCart retired. |

**Edge-runtime gotchas:** never call `redirect()`/`notFound()` in render paths;
no event handlers on Server Component elements; new CF secrets need a fresh deploy.
