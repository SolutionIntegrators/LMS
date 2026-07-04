export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { pushSaleToAirtable } from '@/lib/airtable'

// Zapier sends a POST with JSON body.
// Auth: include ZAPIER_WEBHOOK_SECRET as x-api-key header in the Zapier request.
//
// Expected body:
// {
//   "email": "customer@example.com",
//   "product_id": "72",          // ThriveCart product ID — OR use product_slug below
//   "product_slug": "diagnose-your-biz-systems",  // alternative to product_id
//   "full_name": "Jane Smith",   // optional
//   "transaction_ref": "dubsado-invoice-123"  // optional, for your records
// }

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

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'email is required', received_keys: Object.keys(body) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (!productId && !productSlug) return new Response('product_id or product_slug is required', { status: 400 })

  const db = createServiceSupabaseClient()

  // Look up product by ThriveCart ID or slug
  let productQuery = db.from('products').select('id, title, auto_grant_tags')
  if (productId) {
    productQuery = productQuery.eq('thrivecart_product_id', productId) as any
  } else {
    productQuery = productQuery.eq('slug', productSlug) as any
  }
  const { data: product } = await productQuery.single()

  if (!product) {
    return new Response(
      JSON.stringify({ error: `No product found for ${productId ? `TC ID ${productId}` : `slug "${productSlug}"`}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
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

  // Grant access
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

  // Apply auto-grant tags from the product config (parity with the ThriveCart route,
  // so tag-gated modules unlock no matter which webhook granted the purchase).
  const autoGrantTags: string[] = (product as any).auto_grant_tags ?? []
  if (autoGrantTags.length > 0) {
    const { data: profileData } = await (db as any).from('profiles').select('tags').eq('id', userId).single()
    const existingTags: string[] = profileData?.tags ?? []
    const mergedTags = [...new Set([...existingTags, ...autoGrantTags])]
    await (db as any).from('profiles').update({ tags: mergedTags }).eq('id', userId)
  }

  await db.from('activity_logs').insert({
    user_id: userId,
    product_id: product.id,
    event_type: 'purchase',
    metadata: { source: 'zapier', email, transaction_ref: transactionRef, full_name: fullName },
  })

  // Mirror the sale into the Airtable Digital Product Hub (best-effort)
  const amountRaw = (body as any).amount
  await pushSaleToAirtable({
    email,
    fullName: fullName || null,
    productName: (product as any).title,
    thrivecartId: productId || null,
    lmsSlug: productSlug || null,
    amount: amountRaw != null && amountRaw !== '' ? Number(amountRaw) : null,
    source: 'Zapier',
    transactionRef,
  })

  return Response.json({
    ok: true,
    message: `Access granted: ${email} → ${product.title}`,
    user_id: userId,
    product_id: product.id,
  })
}
