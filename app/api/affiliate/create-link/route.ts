export const runtime = 'edge'

import { createAffiliateLinksForPartner } from '@/lib/affiliate-links'

// Self-service affiliate link creation, callable by any external automation
// (Zapier/Make, a script, etc.) when a partner requests a link. Auth:
// AFFILIATE_LINK_SECRET via ?key= or x-api-key.
//
// Body (JSON or form): {
//   partner_email:  "partner@example.com",   // required — matches/creates the affiliate
//   partner_name:   "RP Digital Studio",     // optional — used when creating a new affiliate
//   product:        "House of Lume | Dubsado Proposal" | slug,  // required — must be affiliate-eligible
//   commission:     "20"                      // optional — only used when creating a new affiliate
// }
// Returns { ok, results } (idempotent: an existing link for this partner+product is returned).

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.AFFILIATE_LINK_SECRET
  if (!secret) return new Response('AFFILIATE_LINK_SECRET not configured', { status: 503 })
  const url = new URL(request.url)
  const provided = url.searchParams.get('key') ?? request.headers.get('x-api-key') ?? ''
  if (provided !== secret) return new Response('Unauthorized', { status: 401 })

  // Tolerant body parse (JSON, form, or query).
  const ct = (request.headers.get('content-type') || '').toLowerCase()
  let body: Record<string, any> = {}
  if (ct.includes('form')) {
    try { (await request.formData()).forEach((v, k) => { body[k] = typeof v === 'string' ? v : '' }) } catch { /* */ }
  } else {
    const raw = await request.text()
    if (raw.trim().startsWith('{')) { try { body = JSON.parse(raw) } catch { /* */ } }
    if (Object.keys(body).length === 0 && raw.includes('=')) { try { new URLSearchParams(raw).forEach((v, k) => { body[k] = v }) } catch { /* */ } }
  }
  url.searchParams.forEach((v, k) => { if (body[k] == null || body[k] === '') body[k] = v })

  const email = String(body.partner_email ?? body.email ?? '').trim().toLowerCase()
  const partnerName = String(body.partner_name ?? body.name ?? '').trim()
  const commissionRaw = String(body.commission ?? '').trim()

  // Accept one product or many: `products` (array or comma/newline string) or
  // the single `product` field. Airtable multi-selects arrive comma-joined.
  const rawProducts = body.products ?? body.product ?? body.product_slug ?? body.product_name ?? ''
  const productRefs: string[] = (Array.isArray(rawProducts) ? rawProducts : String(rawProducts).split(/[,\n]/))
    .map((s: string) => String(s).trim()).filter(Boolean)

  if (!email) return new Response(JSON.stringify({ error: 'partner_email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (productRefs.length === 0) return new Response(JSON.stringify({ error: 'product(s) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const results = await createAffiliateLinksForPartner({
    email,
    partnerName,
    commissionRate: commissionRaw && !isNaN(Number(commissionRaw)) ? Number(commissionRaw) : null,
    productRefs,
  })

  return Response.json({ ok: true, results })
}
