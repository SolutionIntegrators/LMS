export const runtime = 'edge'

import { processPurchase } from '@/lib/grant'

// Dubsado (or any tool) → Zapier POST. Auth: send ZAPIER_WEBHOOK_SECRET as the
// x-api-key header. Body may be JSON, form-encoded, or query-string.
//
// Fields (email required; then a product, or tags, or both):
//   email            "customer@example.com"                    (required)
//   product_slug     "house-of-lume-dubsado-proposal"          grant product access (a full path like /products/… is ok)
//   tags             "lumebundle" or "lumebundle, vip"         add tag(s) — e.g. an add-on that unlocks gated modules
//   product_name     "House of Lume | Collection"              label for a tag-only add-on sale in Airtable
//   full_name        "Jane Smith"                              optional
//   transaction_ref  "dubsado-invoice-770"                     optional, for your records
//   amount           "1000.00"                                 optional, mirrored to Airtable / used for commissions
//   kit_tag_id       "20027266"                                optional, force a Kit tag

export async function POST(request: Request) {
  const secret = process.env.ZAPIER_WEBHOOK_SECRET
  if (!secret) return new Response('ZAPIER_WEBHOOK_SECRET not configured', { status: 500 })
  if (request.headers.get('x-api-key') !== secret) return new Response('Unauthorized', { status: 401 })

  // Parse defensively — Zapier can send JSON, urlencoded, multipart, or query-string.
  const url = new URL(request.url)
  const ct = (request.headers.get('content-type') || '').toLowerCase()
  let body: Record<string, any> = {}
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    try { (await request.formData()).forEach((v, k) => { body[k] = typeof v === 'string' ? v : '' }) } catch { /* */ }
  } else {
    const raw = await request.text()
    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) { try { body = JSON.parse(raw) } catch { /* */ } }
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0].trim().startsWith('{')) { try { body = JSON.parse(keys[0]) } catch { /* */ } }
    if (Object.keys(body).length === 0 && raw.includes('=')) { try { new URLSearchParams(raw).forEach((v, k) => { body[k] = v }) } catch { /* */ } }
  }
  url.searchParams.forEach((v, k) => { if (body[k] == null || body[k] === '') body[k] = v })

  // Case/punctuation-insensitive field lookup.
  const flat: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) flat[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v
  const pick = (...names: string[]): string => {
    for (const n of names) {
      const v = flat[n.toLowerCase().replace(/[^a-z0-9]/g, '')]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  const email = pick('email', 'emailaddress', 'buyeremail', 'customeremail')
  const productSlug = pick('product_slug', 'slug', 'productslug')
    .replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?products\//i, '').replace(/^\/+|\/+$/g, '')
  const rawTags = flat['tags'] ?? flat['tag']
  const explicitTags = (Array.isArray(rawTags) ? rawTags : String(rawTags ?? '').split(','))
    .map((t: string) => String(t).trim().toLowerCase()).filter(Boolean)
  const amountRaw = pick('amount', 'total', 'price', 'invoicetotal')

  if (!email) {
    return new Response(JSON.stringify({ error: 'email is required', received_keys: Object.keys(body), content_type: ct || '(none)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const result = await processPurchase({
    email,
    fullName: pick('full_name', 'fullname', 'name', 'customername') || null,
    productSlug: productSlug || null,
    explicitTags,
    productName: pick('product_name', 'productname', 'product', 'offer', 'item') || null,
    kitTagOverride: pick('kit_tag_id', 'kittag', 'kit_tag') || null,
    amount: amountRaw !== '' && !isNaN(Number(amountRaw)) ? Number(amountRaw) : null,
    transactionRef: pick('transaction_ref', 'invoice', 'invoicenumber', 'orderid') || null,
    source: 'zapier_webhook',
    airtableSource: 'Zapier',
    origin: url.origin,
    today: new Date().toISOString().slice(0, 10),
  })
  return Response.json(result.body, { status: result.status })
}
