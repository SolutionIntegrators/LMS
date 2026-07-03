# SI Goodies Shop — Admin Guide & SOPs

The LMS lives at **https://goodies.solutionintegrators.us** (also reachable at
lms-egs.pages.dev). Sign in with an admin account, then use the **Admin** link
in the top nav. Admin sections: **Content · Users · Activity Logs · Settings**.

---

## SOP 1 — Create a product

1. **Admin → Content → Add Product**: enter Title (+ ThriveCart Product ID if
   it's sold via ThriveCart) → **Add Product**. New products start **inactive**
   (invisible to students).
2. Click **Edit →** on the product to open its settings:
   - Description, Thumbnail (URL or brand color), **Auto-grant tags on
     purchase** (comma-separated — tags added to the buyer's profile when this
     product is purchased; see SOP 5).
   - **Active** checkbox: tick when ready for students to see it.
3. **Delete product** (bottom of settings) removes the product and all its
   modules/lessons. Purchase history in activity logs is preserved.

## SOP 2 — Build content (modules, lessons, elements)

1. On the product's edit page, **Add Module** (bottom). Each module row lets
   you rename, set a thumbnail, set a **Required tag** (see SOP 5), reorder
   (↑/↓), or delete.
2. **+ Add Lesson** inside a module, then click **Edit** on the lesson:
   - **Content type**: Video (embed URL from Loom/Vimeo/YouTube), Embed
     (Airtable/Notion/forms — the iframe auto-sizes to the content), PDF,
     Text, or Download. Files/images can be uploaded directly (stored in
     Supabase Storage).
   - **Content elements**: a block builder below the media — Button, Heading,
     Text, Bullets, Image, Divider, HTML. Reorder with ↑/↓. Text/Bullets
     support inline markdown: `[label](https://url)` links, `**bold**`,
     `*italic*`.
   - **Access Control**: Published toggle (drafts are admin-only), Free
     preview (anyone signed in can view without purchase), Required tag.
3. For video lessons the description shows **below** the video.

## SOP 3 — Preview as a student

On any product's edit page click **👁 Preview as student ↗** (top right).
Opens the real student view in a new tab with an orange preview banner.
Works on inactive/draft products. Preview visits don't pollute analytics.
Gated modules show a 🔒 tag badge to you (students without the tag see
nothing).

## SOP 4 — Add a user / manage access

Everything is on **Admin → Users**:

- **Add a user** (top form): email + name + optional program → **Add + send
  invite**. Creates their account, emails the branded invite, and grants the
  program in one step. This is the standard onboarding flow.
- **Grant more programs**: the "+ Grant program…" dropdown in their row.
- **Revoke**: the ✕ on a program chip.
- **Name / Tags**: inline edit + Save in their row.
- Students can also self-create an account by requesting a magic link at the
  login page — you can then grant programs to their row.

## SOP 5 — Tags (gating + auto-grant)

Tags live on the user's profile (Users page → Tags column, lowercase,
comma-separated).

- **Gate a module**: set "Required tag" on the module row → students without
  the tag don't see the module at all, and direct lesson links are blocked.
- **Gate a single lesson**: set "Required tag" in the lesson's Access Control.
- **Auto-grant on purchase**: set "Auto-grant tags" on a product → buyers get
  those tags automatically when a purchase webhook fires (unlocks any
  modules/lessons gated by those tags).

## SOP 6 — Purchases → automatic access

Two webhook endpoints grant access automatically (both fail-closed):

- **ThriveCart**: notification URL must be
  `https://goodies.solutionintegrators.us/api/webhooks/thrivecart?key=<THRIVECART_WEBHOOK_SECRET>`
  (secret lives in Cloudflare Pages secrets + .env.local). Products map via
  the ThriveCart Product ID field.
- **Zapier** (e.g. Dubsado → Zapier): POST to `/api/webhooks/zapier` with
  header `x-api-key: <ZAPIER_WEBHOOK_SECRET>` and JSON
  `{email, product_id (TC id) or product_slug, full_name?, transaction_ref?, amount?}`.

Both create the user if needed, grant access, apply auto-grant tags, log the
purchase, and **mirror the sale to the Airtable "SI Digital Product Hub"**
(Customers/Products/Sales) with the amount. Airtable failures never block
access granting.

## SOP 7 — Support requests

The **Support** link in the top nav (all users) opens the ClickUp form:
https://forms.clickup.com/8619174/f/87156-46214/K4501E0ZLSXXXHF6QA

## SOP 8 — Announcements & monitoring

- **Admin → Settings**: announcement bar text + toggle (shows on student
  dashboards).
- **Admin → Activity Logs**: logins, lesson views, completions, purchases —
  filter by email/event/date.
- **Airtable Hub**: business reporting (customers, sales, revenue rollups).
- **Resend dashboard → Logs**: every auth email with delivered/bounce status.

## Emails

See [EMAIL.md](EMAIL.md) — sender identity (connect@solutionintegrators.us via
Resend SMTP), branded templates (source of truth in
[email-templates/](email-templates/)), URL configuration, troubleshooting.

## Architecture / ops quick reference

| Thing | Where |
|---|---|
| Hosting | Cloudflare Pages, project `lms` (edge runtime) |
| Domain | goodies.solutionintegrators.us (CNAME → lms-egs.pages.dev) |
| Database + auth + file storage | Supabase project `fgxivwspgczmzoztqyoy` |
| Deploy | `npx @cloudflare/next-on-pages && npx wrangler pages deploy .vercel/output/static --project-name=lms` |
| Secrets (CF Pages) | SUPABASE_SERVICE_ROLE_KEY, THRIVECART_WEBHOOK_SECRET, ZAPIER_WEBHOOK_SECRET, AIRTABLE_TOKEN |
| Repo | github.com/SolutionIntegrators/LMS (main) |
| Airtable hub | "SI Digital Product Hub" base `appDiqNZWv2YPRYTE` |

**Edge-runtime gotchas for developers**: never call `redirect()`/`notFound()`
in render paths (broken on CF Pages — use middleware or client navigation);
never put event handlers on elements in Server Components; new CF secrets
require a fresh deploy to appear.
