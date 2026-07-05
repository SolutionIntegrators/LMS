# Affiliate & Referral Program — SOP

How the whole affiliate system works and how to run it. Covers adding affiliates,
self-service link requests, sale attribution, revenue-share partnerships, and payouts.

---

## The big picture

- **Affiliate** = a person (name, email, commission %). They can hold **one tracking link per product**.
- **Tracking link** = `goodies.solutionintegrators.us/r/<code>` → logs the click, drops a 60-day cookie, and redirects to that product's sales page.
- **Attribution** = when a referred person buys the linked product and signs into the portal, the sale is credited to that affiliate and a payout is written to your Backoffice **Affiliate & Referral Payout** table.
- **Revenue-share partnership** = a partner who earns a % on *every* sale of certain products, regardless of referral (e.g. Laura on House of Lume).
- Everything is managed in the **LMS admin** (source of truth); it mirrors to your **Backoffice Airtable** so partners see their links, clicks, and payouts in their interface.

---

## 1. Make a product affiliate-eligible

A product can only get affiliate links once it has a sales page URL.

1. **Admin → Content →** click the product → **Edit**
2. Fill **"Sales page URL (for affiliate links)"** with the product's public sales page
3. **Save**

Filling it = eligible (and that's where its links redirect). Clearing it = not eligible.
Also add the product's exact title as an option in the Airtable **Link Requests → Product** dropdown (so partners can request it — see §4).

---

## 2. Add an affiliate manually + give them links

1. **Admin → Affiliates**
2. **Add Affiliate**: Name, Email (needed for their emails + payout matching), Commission %
3. In that affiliate's card, use **"+ Add link"**: pick the Product, paste the Destination URL, (optional) custom code → **Add link**
4. They're emailed their link automatically, and it appears in their Airtable **Affiliate Links** list.

Repeat "+ Add link" for each product they promote.

---

## 3. "Become an affiliate" (new applicants)

- A **"Become an affiliate"** link sits in the portal top nav (next to Support), pointing to your application form.
- A customer applies → they land in your **Affiliate & Referral Partners** table as a new applicant → you review/approve as usual.
- Once they exist as a partner, they can request links (§4).

---

## 4. Self-service link requests (partner interface)

Approved partners request their own links from inside their Airtable interface. **One-time setup:**

**A) Interface element** (partner detail page):
1. Open the partner interface → edit the partner's detail page
2. Add a **linked-records list** (or button) bound to **Link Requests**, with **"Allow users to create records"** on
3. Show the **Product** field (single-select) + **Created Link**

**B) Automation** (Airtable → Automations):
1. Trigger: **When a record is created** in **Link Requests**
2. Action: **Send webhook / POST** to:
   `https://goodies.solutionintegrators.us/api/affiliate/create-link?key=<AFFILIATE_LINK_SECRET>`
   Body (JSON):
   - `partner_email` → the Partner's Email Address
   - `partner_name` → the Partner's name
   - `product` → the selected **Product** (or `products` for multiple)
3. Action: **Update record** → set **Created Link** = the webhook response's `results[0].link`, **Status** = `Created`

Then: partner picks a product → gets a working tracked link in seconds, no work from you.
*(The `AFFILIATE_LINK_SECRET` value is in the project's `.env.local` / Cloudflare env.)*

---

## 5. How purchases get attributed (automatic)

1. Someone clicks an affiliate link → click logged, 60-day cookie set
2. They buy the linked product (Dubsado → Zapier grants access + records the amount)
3. When they buy **or** next sign into the portal, the sale is credited to that affiliate
4. Commission (sale × their %) is written to the **Affiliate & Referral Payout** table, linked to the partner

Scope = **only the product the link pointed to**. Attribution needs the click + eventual login in the **same browser** within 60 days; for the rare miss, assign the affiliate manually on the payout record.

---

## 6. Revenue-share partnerships (e.g. Laura)

For a partner who earns a % on **every** sale of specific products (no referral needed).
Each rule maps a product (or a named add-on) → a partner + rate. On every sale of that
product, a payout is auto-created (deduped per transaction, so retries never double-pay).

To add or change a rule, ask to insert into `product_revenue_shares`:
- `product_id` (for a real product) **or** `label` (for a tag-only add-on, matched by its `product_name`)
- `partner_email`, `partner_name`, `rate` (%)

Add-ons that aren't set up as a rule are automatically excluded (e.g. a bundle upsell won't pay unless it has its own rule). Payouts appear in the payout table noted "revenue-share partnership (N%)".

---

## 7. Where partners see their stuff (Airtable interface)

- **Affiliate Links** table → their links, per-link **Clicks**, product, URL
- **Referral Clicks** on their partner row → total clicks across links
- **Affiliate & Referral Payout** table → commissions owed/paid

**Daily click sync:** clicks live in the LMS and are pushed to Airtable once a day.
Set up a **Zapier Schedule → Webhook (GET)** to:
`https://goodies.solutionintegrators.us/api/cron/sync-affiliate-clicks?key=<CRON_SECRET>` (once/day).

---

## 8. Paying out

Work from the **Affiliate & Referral Payout** table: each row has the partner (with their
PayPal email via lookup), the sale, and the calculated payout. Pay from there and mark the
row's status as you go.
