export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { pushSaleToAirtable } from '@/lib/airtable'

// Zapier POST. Auth: send ZAPIER_WEBHOOK_SECRET as the x-api-key header.
// Body may be JSON, form-encoded, or query-string.
//
// Fields (email required; then a product, or tags, or both):
//   email            "customer@example.com"                    (required)
//   product_slug     "house-of-lume-dubsado-proposal"          grant product access (a full path like /products/… is ok)
//   product_id       "72"                                      alternative to product_slug (ThriveCart ID)
//   tags             "lumebundle" or "lumebundle, vip"         add tag(s) to the profile — e.g. an add-on that unlocks gated modules
//   full_name        "Jane Smith"                              optional
//   transaction_ref  "dubsado-invoice-770"                     optional, for your records
//   amount           "1000.00"                                 optional, mirrored to Airtable for product sales
//
// Examples:
//   Base purchase:  { email, product_slug: "house-of-lume-dubsado-proposal" }
//   Bundle add-on:  { email, tags: "lumebundle" }                (no product — just the tag)
//   Product + tag:  { email, product_slug: "…", tags: "vip" }

export async function POST(request: Request) {
  // Auth
  const secret = process.env.ZAPIER_WEBHOOK_SECRET
  const apiKey = request.headers.get('x-api-key')

  if (!secret) return new Response('ZAPIER_WEBHOOK_SECRET not configured', { status: 500 })
  if (apiKey !== secret) return new Response('Unauthorized', { status: 401 })

  // Accept JSON, form-encoded, or query-string bodies — Zapier's "Webhooks"
  // action can send any of these depending on its Payload Type setting, so we
  // parse defensively instead of assuming JSON.
  const url = new URL(request.url)
  const raw = await request.text()
  let body: Record<string, any> = {}

  // 1) Try JSON
  if (raw.trim().startsWith('{')) {
    try { body = JSON.parse(raw) } catch { /* fall through */ }
  }
  // 2) A single stringified-JSON key (a common Zapier form-mode misconfig)
  if (!body.email && !body.product_slug && !body.product_id) {
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0].trim().startsWith('{')) {
      try { body = JSON.parse(keys[0]) } catch { /* fall through */ }
    }
  }
  // 3) Form-encoded body
  if (!body.email && raw.includes('=')) {
    try {
      const form = new URLSearchParams(raw)
      const obj: Record<string, string> = {}
      form.forEach((v, k) => { obj[k] = v })
      if (obj.email || obj.product_slug || obj.product_id) body = obj
    } catch { /* fall through */ }
  }
  // 4) Query-string fallback (?email=…&product_slug=…)
  url.searchParams.forEach((v, k) => { if (body[k] == null || body[k] === '') body[k] = v })

  const email: string = String(body.email ?? '').trim()
  const productId: string = String(body.product_id ?? '').trim()
  // Normalize the slug: accept a full path like "/products/foo" or "foo/".
  const productSlug: string = String(body.product_slug ?? '')
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/?products\//i, '')
    .replace(/^\/+|\/+$/g, '')
  const fullName: string = String(body.full_name ?? '').trim()
  const transactionRef: string = String(body.transaction_ref ?? '').trim()

  // Optional explicit tags: accepts a comma-separated string ("lumebundle, vip")
  // or an array. Used for add-ons that grant a tag rather than a product — e.g.
  // buying the Collection Bundle add-on adds "lumebundle" to unlock gated modules.
  const rawTags = body.tags
  const explicitTags: string[] = (Array.isArray(rawTags) ? rawTags : String(rawTags ?? '').split(','))
    .map((t: string) => String(t).trim().toLowerCase())
    .filter(Boolean)

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'email is required', received_keys: Object.keys(body) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (!productId && !productSlug && explicitTags.length === 0) {
    return new Response('product_id, product_slug, or tags is required', { status: 400 })
  }

  const db = createServiceSupabaseClient()

  // Look up product by ThriveCart ID or slug — only if one was provided. A
  // tags-only call (an add-on with no separate product) skips this.
  let product: any = null
  if (productId || productSlug) {
    let productQuery = db.from('products').select('id, title, auto_grant_tags')
    productQuery = (productId
      ? productQuery.eq('thrivecart_product_id', productId)
      : productQuery.eq('slug', productSlug)) as any
    const { data } = await productQuery.single()
    product = data
    if (!product) {
      return new Response(
        JSON.stringify({ error: `No product found for ${productId ? `TC ID ${productId}` : `slug "${productSlug}"`}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Find or create user
  const { data: existingProfile } = await db.from('profiles').select('id').eq('email', email).single()
  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const { data: newUser, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName || undefined },
    })
    if (error || !newUser.user) {
      return new Response(`Failed to create user: ${error?.message}`, { status: 500 })
    }
    userId = newUser.user.id
    await db.from('profiles').upsert({ id: userId, email, full_name: fullName || null, role: 'user' }, { onConflict: 'id' })
  }

  // Grant product access (only when a product was matched)
  if (product) {
    const { error: accessError } = await db.from('user_product_access').upsert({
      user_id: userId,
      product_id: product.id,
      granted_by: 'zapier_webhook',
      transaction_ref: transactionRef || null,
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })

    if (accessError) {
      return new Response(`Failed to grant access: ${accessError.message}`, { status: 500 })
    }
  }

  // Apply tags: the product's own auto_grant_tags PLUS any explicit tags in the
  // payload. Merged into one update so tag-gated modules unlock regardless of
  // whether a product was purchased.
  const tagsToAdd = [...new Set([...(product?.auto_grant_tags ?? []), ...explicitTags])] as string[]
  if (tagsToAdd.length > 0) {
    const { data: profileData } = await (db as any).from('profiles').select('tags').eq('id', userId).single()
    const existingTags: string[] = profileData?.tags ?? []
    const mergedTags = [...new Set([...existingTags, ...tagsToAdd])]
    await (db as any).from('profiles').update({ tags: mergedTags }).eq('id', userId)
  }

  await db.from('activity_logs').insert({
    user_id: userId,
    product_id: product?.id ?? null,
    event_type: product ? 'purchase' : 'tag_grant',
    metadata: { source: 'zapier', email, transaction_ref: transactionRef, full_name: fullName, tags: tagsToAdd },
  })

  // Mirror the sale into the Airtable Digital Product Hub (best-effort). Only
  // product purchases are logged as sales; tag-only add-ons are skipped there.
  if (product) {
    const amountRaw = (body as any).amount
    await pushSaleToAirtable({
      email,
      fullName: fullName || null,
      productName: product.title,
      thrivecartId: productId || null,
      lmsSlug: productSlug || null,
      amount: amountRaw != null && amountRaw !== '' ? Number(amountRaw) : null,
      source: 'Zapier',
      transactionRef,
    })
  }

  return Response.json({
    ok: true,
    message: product
      ? `Access granted: ${email} → ${product.title}${tagsToAdd.length ? ` (tags: ${tagsToAdd.join(', ')})` : ''}`
      : `Tags added: ${email} → ${tagsToAdd.join(', ')}`,
    user_id: userId,
    product_id: product?.id ?? null,
    tags_added: tagsToAdd,
  })
}
