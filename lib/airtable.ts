// Pushes a sale into the standalone "SI Digital Product Hub" Airtable base.
// Best-effort: any failure here must NOT break access granting (Supabase is source of truth).

const AIRTABLE_API = 'https://api.airtable.com/v0'
const BASE_ID = 'appDiqNZWv2YPRYTE'
const T_CUSTOMERS = 'tblfUkvC9OEM6HhMx'
const T_PRODUCTS = 'tblaL2e7RG0W18oJU'
const T_SALES = 'tblUqIR6quCX2s6E0'

// Backoffice Management Hub → Affiliate & Referral Partners (separate base).
const PARTNERS_BASE = process.env.AIRTABLE_PARTNERS_BASE_ID || 'appCDKeRL8J1xVmuO'
const PARTNERS_TABLE = process.env.AIRTABLE_PARTNERS_TABLE || 'tblbzTvY0pRSt6Wxv'
const PARTNERS_PAYOUT_TABLE = process.env.AIRTABLE_PAYOUT_TABLE || 'tblWej0WLbMqNJdrE'
const LINKS_TABLE = process.env.AIRTABLE_LINKS_TABLE || 'tblCBzZBVXlLjJp6z'
const ABANDONED_TABLE = process.env.AIRTABLE_ABANDONED_TABLE || 'tblE2EhqFBl671zpE'
// "Products" (digital products) table in the Backoffice base, linked from payouts.
const PARTNERS_PRODUCTS_TABLE = process.env.AIRTABLE_PARTNERS_PRODUCTS_TABLE || 'tbl26UczLHCUMb2zO'

// Payout productTitle (an LMS product title or a rev-share rule label) → the
// exact {Name} in the Backoffice Products table, for the ones whose names don't
// match. Anything not listed falls back to an exact (case-insensitive) name
// match, so products named identically in both places link automatically.
const DIGITAL_PRODUCT_ALIASES: Record<string, string> = {
  'house of lume | dubsado proposal': 'House of Lume',
  'house of lume collection upsell': 'House of Lume | Collection',
  'aurum financial | dubsado proposal': 'Aurum Financial | Coded Dubsado Proposal',
  // "Sell Anything With Dubsado" matches "Sell Anything with Dubsado" by
  // case-insensitive name — no alias needed.
}

// Resolve a payout's product title to a Backoffice Products record id (or null).
async function findDigitalProductId(productTitle?: string | null): Promise<string | null> {
  const title = (productTitle || '').trim()
  if (!token() || !title) return null
  const target = DIGITAL_PRODUCT_ALIASES[title.toLowerCase()] || title
  try {
    const qs = new URLSearchParams({ filterByFormula: `LOWER({Name})='${esc(target.toLowerCase())}'`, maxRecords: '1' })
    const found = await at(`${PARTNERS_BASE}/${PARTNERS_PRODUCTS_TABLE}?${qs.toString()}`)
    return found.records?.[0]?.id ?? null
  } catch (err) {
    console.error('findDigitalProductId failed:', err instanceof Error ? err.message : err)
    return null
  }
}

type Json = Record<string, unknown>

function token() {
  return process.env.AIRTABLE_TOKEN
}

async function at(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AIRTABLE_API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

// Sanitize a value for an Airtable filterByFormula string literal. Airtable
// formulas don't support backslash escapes, so strip quotes outright.
function esc(v: string) {
  return v.replace(/['"\\]/g, '')
}

async function findRecord(table: string, formula: string): Promise<string | null> {
  const qs = new URLSearchParams({ filterByFormula: formula, maxRecords: '1' })
  const data = await at(`${BASE_ID}/${table}?${qs.toString()}`)
  return data.records?.[0]?.id ?? null
}

async function createRecord(table: string, fields: Json): Promise<string> {
  const data = await at(`${BASE_ID}/${table}`, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  })
  return data.id
}

export interface SaleInput {
  email: string
  fullName?: string | null
  productName: string
  lmsSlug?: string | null
  amount?: number | null
  source: 'Zapier' | 'Stripe' | 'Manual' | 'LMS'
  transactionRef?: string | null
}

export async function pushSaleToAirtable(input: SaleInput): Promise<void> {
  if (!token()) return // not configured — skip silently
  try {
    const email = input.email.trim()
    const today = new Date().toISOString().slice(0, 10)

    // Customer (find by email, else create)
    let customerId = await findRecord(T_CUSTOMERS, `LOWER({Email})='${esc(email.toLowerCase())}'`)
    if (!customerId) {
      customerId = await createRecord(T_CUSTOMERS, {
        Name: input.fullName?.trim() || email,
        Email: email,
        'First Purchase Date': today,
        Origin: input.source,
      })
    }

    // Product (find by name, else create)
    let productId: string | null = await findRecord(T_PRODUCTS, `{Product Name}='${esc(input.productName)}'`)
    if (!productId) {
      const fields: Json = { 'Product Name': input.productName, Active: true }
      if (input.lmsSlug) fields['LMS Slug'] = input.lmsSlug
      productId = await createRecord(T_PRODUCTS, fields)
    }

    // Sale
    const saleFields: Json = {
      'Sale ID': `${email} - ${input.productName}`,
      'Purchase Date': today,
      Source: input.source,
      'Buyer Email': email,
      Customer: [customerId],
      Product: [productId],
    }
    if (input.amount != null && !Number.isNaN(input.amount)) saleFields['Amount'] = input.amount
    if (input.transactionRef) saleFields['Transaction Ref'] = input.transactionRef

    await createRecord(T_SALES, saleFields)
  } catch (err) {
    // Never throw — log and move on so purchase processing still succeeds.
    console.error('pushSaleToAirtable failed:', err instanceof Error ? err.message : err)
  }
}

// Stamp traffic attribution (source/medium/campaign, captured client-side on the
// thank-you page) onto the already-created Sales row in the SI Digital Product
// Hub, matched by Transaction Ref. Best-effort + update-only. Returns true if a
// row was found and patched (so the caller can retry if the mirror lagged).
export async function updateSaleAttribution(transactionRef: string, attr: {
  source?: string | null
  medium?: string | null
  campaign?: string | null
}): Promise<boolean> {
  if (!token() || !transactionRef) return false
  const fields: Json = {}
  if (attr.source) fields['Traffic Source'] = attr.source
  if (attr.medium) fields['Traffic Medium'] = attr.medium
  if (attr.campaign) fields['Campaign'] = attr.campaign
  if (Object.keys(fields).length === 0) return false
  try {
    const id = await findRecord(T_SALES, `{Transaction Ref}='${esc(transactionRef)}'`)
    if (!id) return false
    await at(`${BASE_ID}/${T_SALES}/${id}`, { method: 'PATCH', body: JSON.stringify({ fields }) })
    return true
  } catch (err) {
    console.error('updateSaleAttribution failed:', err instanceof Error ? err.message : err)
    return false
  }
}

// Stamp an affiliate's code onto their existing partner row in the Backoffice
// Hub (matched by Email Address). The "Affiliate Link" formula field builds the
// full URL from it. Best-effort + update-only: if no partner matches the email
// we skip rather than create, so partner records / payout links stay intact.
export async function syncAffiliateCodeToPartnerHub(email: string, code: string): Promise<void> {
  if (!token() || !email) return
  try {
    const qs = new URLSearchParams({
      filterByFormula: `LOWER({Email Address})='${esc(email.toLowerCase())}'`,
      maxRecords: '1',
    })
    const found = await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}?${qs.toString()}`)
    const rec = found.records?.[0]
    if (!rec) {
      console.warn(`No partner record found for affiliate email ${email} — code not synced`)
      return
    }
    await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}/${rec.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { 'Affiliate Code': code }, typecast: true }),
    })
  } catch (err) {
    console.error('syncAffiliateCodeToPartnerHub failed:', err instanceof Error ? err.message : err)
  }
}

// Upsert one row in the "Affiliate Links" table (by Code), linked to the
// partner. Called when a link is created so partners see all their links in the
// interface. Best-effort.
export async function upsertAffiliateLink(opts: {
  partnerEmail?: string | null
  product?: string | null
  code: string
  url: string
}): Promise<void> {
  if (!token() || !opts.code) return
  try {
    let partnerId: string | null = null
    if (opts.partnerEmail) {
      const qs = new URLSearchParams({ filterByFormula: `LOWER({Email Address})='${esc(opts.partnerEmail.toLowerCase())}'`, maxRecords: '1' })
      const found = await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}?${qs.toString()}`)
      partnerId = found.records?.[0]?.id ?? null
    }
    const fields: Json = { Code: opts.code, 'Tracking Link': opts.url }
    if (opts.product) fields['Product'] = opts.product
    if (partnerId) fields['Partner'] = [partnerId]

    const qs2 = new URLSearchParams({ filterByFormula: `{Code}='${esc(opts.code)}'`, maxRecords: '1' })
    const existing = await at(`${PARTNERS_BASE}/${LINKS_TABLE}?${qs2.toString()}`)
    const rec = existing.records?.[0]
    if (rec) {
      await at(`${PARTNERS_BASE}/${LINKS_TABLE}/${rec.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) })
    } else {
      fields['Clicks'] = 0
      await at(`${PARTNERS_BASE}/${LINKS_TABLE}`, { method: 'POST', body: JSON.stringify({ fields }) })
    }
  } catch (err) {
    console.error('upsertAffiliateLink failed:', err instanceof Error ? err.message : err)
  }
}

// Update a single link row's click count (by Code). Best-effort.
export async function updateAffiliateLinkClicks(code: string, clicks: number): Promise<boolean> {
  if (!token() || !code) return false
  try {
    const qs = new URLSearchParams({ filterByFormula: `{Code}='${esc(code)}'`, maxRecords: '1' })
    const found = await at(`${PARTNERS_BASE}/${LINKS_TABLE}?${qs.toString()}`)
    const rec = found.records?.[0]
    if (!rec) return false
    await at(`${PARTNERS_BASE}/${LINKS_TABLE}/${rec.id}`, { method: 'PATCH', body: JSON.stringify({ fields: { Clicks: clicks } }) })
    return true
  } catch (err) {
    console.error('updateAffiliateLinkClicks failed:', err instanceof Error ? err.message : err)
    return false
  }
}

// Write a partner's total referral-click count onto their Backoffice row
// (matched by Email Address). Best-effort, update-only. Returns true if updated.
export async function updatePartnerClicks(email: string, clicks: number): Promise<boolean> {
  if (!token() || !email) return false
  try {
    const qs = new URLSearchParams({
      filterByFormula: `LOWER({Email Address})='${esc(email.toLowerCase())}'`,
      maxRecords: '1',
    })
    const found = await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}?${qs.toString()}`)
    const rec = found.records?.[0]
    if (!rec) return false
    await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}/${rec.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { 'Referral Clicks': clicks } }),
    })
    return true
  } catch (err) {
    console.error('updatePartnerClicks failed:', err instanceof Error ? err.message : err)
    return false
  }
}

// Record an abandoned Stripe checkout in the Backoffice "Abandoned Cart Metrics"
// table. Best-effort. Name fields fill in only if the customer entered them
// before leaving; the metric (product/amount/date) is recorded either way.
export async function pushAbandonedCart(opts: {
  fullName?: string | null
  amount: number | null
  productName?: string | null
  date: string // YYYY-MM-DD
}): Promise<void> {
  if (!token()) return
  try {
    const parts = (opts.fullName || '').trim().split(/\s+/).filter(Boolean)
    const fields: Json = {
      Date: opts.date,
      'Activity Type': 'Abandoned Cart',
      Source: 'Stripe',
    }
    if (parts.length) {
      fields['First Name'] = parts[0]
      if (parts.length > 1) fields['Last Name'] = parts.slice(1).join(' ')
    }
    if (opts.productName) fields['Product'] = opts.productName
    if (opts.amount != null) fields['Amount'] = opts.amount
    await at(`${PARTNERS_BASE}/${ABANDONED_TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields, typecast: true }),
    })
  } catch (err) {
    console.error('pushAbandonedCart failed:', err instanceof Error ? err.message : err)
  }
}

// Create a payout record in the Backoffice "Affiliate & Referral Payout" table
// when a referred sale is attributed. Writes only the real (non-lookup) fields;
// Partner Email / Referred Sales / Client's Service are lookups that populate
// automatically from the linked partner. Best-effort.
export async function pushReferralPayout(opts: {
  partnerEmail?: string | null
  buyerLabel: string
  productTitle?: string | null
  saleAmount: number | null
  commission: number | null
  code?: string | null
  date: string // YYYY-MM-DD (passed in; edge runtime has no Date.now in some contexts)
  sourceNote?: string | null
}): Promise<void> {
  if (!token()) return
  try {
    const noteBits = [
      opts.productTitle ? `Product: ${opts.productTitle}` : null,
      opts.saleAmount != null ? `Sale: $${opts.saleAmount}` : null,
      opts.code ? `via /r/${opts.code}` : null,
      opts.sourceNote || 'auto-attributed by the LMS',
    ].filter(Boolean)
    const fields: Json = {
      'Referred Client': opts.buyerLabel,
      'Record Created Date': opts.date,
      Notes: noteBits.join(' · '),
    }
    if (opts.commission != null) fields['Payout'] = opts.commission

    // Link the digital product (best-effort; skipped if no matching record).
    const digitalProductId = await findDigitalProductId(opts.productTitle)
    if (digitalProductId) fields['Digital Products'] = [digitalProductId]

    // Link the specific affiliate link that earned this payout (by tracking
    // code), so the Affiliate Links table can roll up a per-link payout total.
    // Only attribution payouts carry a code; revenue-share payouts don't.
    if (opts.code) {
      const qs = new URLSearchParams({ filterByFormula: `{Code}='${esc(opts.code)}'`, maxRecords: '1' })
      const foundLink = await at(`${PARTNERS_BASE}/${LINKS_TABLE}?${qs.toString()}`)
      const linkId = foundLink.records?.[0]?.id
      if (linkId) fields['Affiliate Link'] = [linkId]
    }

    if (opts.partnerEmail) {
      const qs = new URLSearchParams({
        filterByFormula: `LOWER({Email Address})='${esc(opts.partnerEmail.toLowerCase())}'`,
        maxRecords: '1',
      })
      const found = await at(`${PARTNERS_BASE}/${PARTNERS_TABLE}?${qs.toString()}`)
      const pid = found.records?.[0]?.id
      if (pid) fields['Affiliate & Referral Partners'] = [pid]
    }

    await at(`${PARTNERS_BASE}/${PARTNERS_PAYOUT_TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields, typecast: true }),
    })
  } catch (err) {
    console.error('pushReferralPayout failed:', err instanceof Error ? err.message : err)
  }
}
