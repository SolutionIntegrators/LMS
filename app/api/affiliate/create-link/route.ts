export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { upsertAffiliateLink } from '@/lib/airtable'

// Self-service affiliate link creation, called by an Airtable automation when a
// partner requests a link. Auth: AFFILIATE_LINK_SECRET via ?key= or x-api-key.
//
// Body (JSON or form): {
//   partner_email:  "partner@example.com",   // required — matches/creates the affiliate
//   partner_name:   "RP Digital Studio",     // optional — used when creating a new affiliate
//   product:        "House of Lume | Dubsado Proposal" | slug,  // required — must be affiliate-eligible
//   commission:     "20"                      // optional — only used when creating a new affiliate
// }
// Returns { ok, code, link } (idempotent: an existing link for this partner+product is returned).

function toCode(raw: string) {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
}

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

  const db = createServiceSupabaseClient()

  // Find or create the affiliate by email (once).
  let { data: affiliate } = await (db as any).from('affiliates').select('id, name, email').eq('email', email).maybeSingle()
  if (!affiliate) {
    const commission_rate = commissionRaw && !isNaN(Number(commissionRaw)) ? Number(commissionRaw) : 0
    const { data: created, error } = await (db as any).from('affiliates')
      .insert({ name: partnerName || email, email, commission_rate }).select('id, name, email').single()
    if (error) return new Response(`Failed to create affiliate: ${error.message}`, { status: 500 })
    affiliate = created
  }

  async function createOneLink(productRef: string): Promise<any> {
    const norm = productRef.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?products\//i, '').replace(/^\/+|\/+$/g, '')
    const { data: products } = await (db as any).from('products')
      .select('id, title, slug, sales_page_url')
      .or(`slug.eq.${norm},title.ilike.${productRef}`)
    const product = (products ?? []).find((p: any) => p.sales_page_url) ?? null
    if (!product) return { product: productRef, error: 'not affiliate-eligible (no Sales page URL)' }

    // Idempotent: reuse an existing link for this partner + product.
    const { data: existing } = await (db as any).from('affiliate_links')
      .select('code').eq('affiliate_id', affiliate.id).eq('product_id', product.id).maybeSingle()
    if (existing) return { product: product.title, code: existing.code, link: `${url.origin}/r/${existing.code}`, existed: true }

    let base = toCode(`${affiliate.name}-${product.slug}`) || 'link'
    const { data: taken } = await (db as any).from('affiliate_links').select('code').like('code', `${base}%`)
    const takenSet = new Set((taken ?? []).map((r: any) => r.code))
    let code = base
    for (let n = 2; takenSet.has(code); n++) code = `${base}-${n}`

    const { error: linkErr } = await (db as any).from('affiliate_links')
      .insert({ affiliate_id: affiliate.id, product_id: product.id, code, destination_url: product.sales_page_url })
    if (linkErr) return { product: product.title, error: linkErr.message }

    const link = `${url.origin}/r/${code}`
    await upsertAffiliateLink({ partnerEmail: email, product: product.title, code, url: link })
    return { product: product.title, code, link }
  }

  const results = []
  for (const ref of productRefs) results.push(await createOneLink(ref))

  return Response.json({ ok: true, results })
}
