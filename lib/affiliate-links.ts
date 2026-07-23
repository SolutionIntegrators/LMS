// Shared "find-or-create affiliate + create their tracking link(s)" logic,
// used by both the self-service create-link API (called by an external
// automation/integration) and the Airtable Link Requests polling cron (see
// /api/cron/sync-link-requests) — the two entry points for partner
// self-service link requests.

import { createServiceSupabaseClient } from './supabase-service'
import { upsertAffiliateLink } from './airtable'
import { branding } from './branding'

function toCode(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
}

export interface AffiliateLinkResult {
  product: string
  code?: string
  link?: string
  existed?: boolean
  error?: string
}

// Finds or creates the affiliate by email, then creates (or reuses) one
// tracking link per requested product. Each productRef may be a product
// title, slug, or a `/products/<slug>` path.
export async function createAffiliateLinksForPartner(opts: {
  email: string
  partnerName?: string | null
  commissionRate?: number | null
  productRefs: string[]
}): Promise<AffiliateLinkResult[]> {
  const email = opts.email.trim().toLowerCase()
  const db = createServiceSupabaseClient() as any

  let { data: affiliate } = await db.from('affiliates').select('id, name, email').eq('email', email).maybeSingle()
  if (!affiliate) {
    const commission_rate = opts.commissionRate != null && !isNaN(opts.commissionRate) ? opts.commissionRate : 0
    const { data: created, error } = await db.from('affiliates')
      .insert({ name: opts.partnerName || email, email, commission_rate }).select('id, name, email').single()
    if (error) return [{ product: 'account', error: `Failed to create affiliate: ${error.message}` }]
    affiliate = created
  }

  async function createOneLink(productRef: string): Promise<AffiliateLinkResult> {
    const norm = productRef.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?products\//i, '').replace(/^\/+|\/+$/g, '')
    const { data: products } = await db.from('products')
      .select('id, title, slug, sales_page_url')
      .or(`slug.eq.${norm},title.ilike.${productRef}`)
    const product = (products ?? []).find((p: any) => /^https?:\/\//.test((p.sales_page_url ?? '').trim())) ?? null
    if (!product) return { product: productRef, error: 'not affiliate-eligible (no valid Sales page URL)' }

    // Idempotent: reuse an existing link for this partner + product.
    const { data: existing } = await db.from('affiliate_links')
      .select('code').eq('affiliate_id', affiliate.id).eq('product_id', product.id).maybeSingle()
    if (existing) return { product: product.title, code: existing.code, link: `${branding.siteUrl}/r/${existing.code}`, existed: true }

    let base = toCode(`${affiliate.name}-${product.slug}`) || 'link'
    const { data: taken } = await db.from('affiliate_links').select('code').like('code', `${base}%`)
    const takenSet = new Set((taken ?? []).map((r: any) => r.code))
    let code = base
    for (let n = 2; takenSet.has(code); n++) code = `${base}-${n}`

    const { error: linkErr } = await db.from('affiliate_links')
      .insert({ affiliate_id: affiliate.id, product_id: product.id, code, destination_url: product.sales_page_url.trim() })
    if (linkErr) return { product: product.title, error: linkErr.message }

    const link = `${branding.siteUrl}/r/${code}`
    await upsertAffiliateLink({ partnerEmail: email, partnerName: affiliate.name || null, product: product.title, code, url: link })
    return { product: product.title, code, link }
  }

  const results: AffiliateLinkResult[] = []
  for (const ref of opts.productRefs) results.push(await createOneLink(ref))
  return results
}
