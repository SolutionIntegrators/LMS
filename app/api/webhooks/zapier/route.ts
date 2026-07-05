export const runtime = 'edge'

import { createServiceSupabaseClient } from '@/lib/supabase-service'
import { pushSaleToAirtable } from '@/lib/airtable'
import { sendProductAccessEmail } from '@/lib/email'
import { tagSubscriber } from '@/lib/kit'

// Zapier POST. Auth: send ZAPIER_WEBHOOK_SECRET as the x-api-key header.
// Body may be JSON, form-encoded, or query-string.
//
// Fields (email required; then a product, or tags, or both):
//   email            "customer@example.com"                    (required)
//   product_slug     "house-of-lume-dubsado-proposal"          grant product access (a full path like /products/… is ok)
//   product_id       "72"                                      alternative to product_slug (ThriveCart ID)
//   tags             "lumebundle" or "lumebundle, vip"         add tag(s) to the profile — e.g. an add-on that unlocks gated modules
//   product_name     "House of Lume | Collection Bundle"       label for a tag-only add-on sale in Airtable (ignored if a product matched)
//   full_name        "Jane Smith"                              optional
//   transaction_ref  "dubsado-invoice-770"                     optional, for your records
//   amount           "1000.00"                                 optional, mirrored to Airtable as the sale amount
//
// Examples:
//   Base purchase:  { email, product_slug: "house-of-lume-dubsado-proposal", amount: "1000" }
//   Bundle add-on:  { email, tags: "lumebundle", product_name: "House of Lume | Collection Bundle", amount: "500" }
//   Product + tag:  { email, product_slug: "…", tags: "vip" }

export async function POST(request: Request) {
  // Auth
  const secret = process.env.ZAPIER_WEBHOOK_SECRET
  const apiKey = request.headers.get('x-api-key')

  if (!secret) return new Response('ZAPIER_WEBHOOK_SECRET not configured', { status: 500 })
  if (apiKey !== secret) return new Response('Unauthorized', { status: 401 })

  // Parse the body defensively — Zapier can send JSON, urlencoded, multipart,
  // or query-string depending on how the action is configured.
  const url = new URL(request.url)
  const ct = (request.headers.get('content-type') || '').toLowerCase()
  let body: Record<string, any> = {}

  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    // formData() handles both urlencoded and multipart.
    try {
      const fd = await request.formData()
      fd.forEach((v, k) => { body[k] = typeof v === 'string' ? v : '' })
    } catch { /* fall through to empty */ }
  } else {
    const raw = await request.text()
    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      try { body = JSON.parse(raw) } catch { /* fall through */ }
    }
    // A single stringified-JSON key (a common Zapier form-mode misconfig)
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0].trim().startsWith('{')) {
      try { body = JSON.parse(keys[0]) } catch { /* fall through */ }
    }
    // Bare form-encoded body (no/other content-type but looks like a=b&c=d)
    if (Object.keys(body).length === 0 && raw.includes('=')) {
      try {
        const form = new URLSearchParams(raw)
        form.forEach((v, k) => { body[k] = v })
      } catch { /* fall through */ }
    }
  }
  // Query-string fallback / override for anything still missing.
  url.searchParams.forEach((v, k) => { if (body[k] == null || body[k] === '') body[k] = v })

  // Case- and punctuation-insensitive field lookup so "Email", "product slug",
  // "productSlug", "Full Name" etc. from Zapier field mappings all resolve.
  const flat: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) flat[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v
  const pick = (...names: string[]): string => {
    for (const n of names) {
      const v = flat[n.toLowerCase().replace(/[^a-z0-9]/g, '')]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  const email: string = pick('email', 'emailaddress', 'buyeremail', 'customeremail')
  const productId: string = pick('product_id', 'thrivecart_product_id')
  // Normalize the slug: accept a full path like "/products/foo" or "foo/".
  const productSlug: string = pick('product_slug', 'slug', 'productslug')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/?products\//i, '')
    .replace(/^\/+|\/+$/g, '')
  const fullName: string = pick('full_name', 'fullname', 'name', 'customername')
  const transactionRef: string = pick('transaction_ref', 'invoice', 'invoicenumber', 'orderid')
  // Optional label for the thing purchased — used as the Airtable sale/product
  // name for tag-only add-ons that have no LMS product (e.g. "House of Lume |
  // Collection Bundle"). Ignored when a real product was matched.
  const productName: string = pick('product_name', 'productname', 'product', 'offer', 'item')
  // Optional Kit tag override (for tag-only add-ons, or to force a tag).
  const kitTagOverride: string = pick('kit_tag_id', 'kittag', 'kit_tag')

  // Optional explicit tags: accepts a comma-separated string ("lumebundle, vip")
  // or an array. Used for add-ons that grant a tag rather than a product — e.g.
  // buying the Collection Bundle add-on adds "lumebundle" to unlock gated modules.
  const rawTags = flat['tags'] ?? flat['tag']
  const explicitTags: string[] = (Array.isArray(rawTags) ? rawTags : String(rawTags ?? '').split(','))
    .map((t: string) => String(t).trim().toLowerCase())
    .filter(Boolean)

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'email is required', received_keys: Object.keys(body), content_type: ct || '(none)' }),
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
    let productQuery = db.from('products').select('id, title, slug, auto_grant_tags, kit_tag_id')
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

  // Find or create user. New buyers get the branded invite (their onboarding
  // email with a login link) via Supabase SMTP — same flow as a manual invite.
  const { data: existingProfile } = await db.from('profiles').select('id').eq('email', email).single()
  let userId: string
  const isNewUser = !existingProfile

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
    })
    if (invited?.user && !inviteErr) {
      userId = invited.user.id
    } else {
      // Fallback: create silently so a bad/duplicate invite never blocks the purchase
      const { data: newUser, error } = await db.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { full_name: fullName || undefined },
      })
      if (error || !newUser.user) {
        return new Response(`Failed to create user: ${error?.message ?? inviteErr?.message}`, { status: 500 })
      }
      userId = newUser.user.id
    }
    await db.from('profiles').upsert({ id: userId, email, full_name: fullName || null, role: 'user' }, { onConflict: 'id' })
  }

  // Grant product access (only when a product was matched). .select() with
  // ignoreDuplicates returns the row ONLY when newly inserted, so we can email
  // existing customers exactly once and never on webhook retries.
  let newlyGranted = false
  if (product) {
    const { data: grantedRows, error: accessError } = await db.from('user_product_access').upsert({
      user_id: userId,
      product_id: product.id,
      granted_by: 'zapier_webhook',
      transaction_ref: transactionRef || null,
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id', ignoreDuplicates: true }).select('id')

    if (accessError) {
      return new Response(`Failed to grant access: ${accessError.message}`, { status: 500 })
    }
    newlyGranted = Array.isArray(grantedRows) && grantedRows.length > 0
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

  // Tag the buyer in Kit (email marketing) — best-effort, idempotent.
  // Uses the product's configured Kit tag and/or a payload override.
  const kitTagIds = new Set<string | number>()
  if (product?.kit_tag_id) kitTagIds.add(product.kit_tag_id)
  if (kitTagOverride) kitTagIds.add(kitTagOverride)
  for (const t of kitTagIds) await tagSubscriber(t, email)

  // Notify existing customers when they gain access to another product. New
  // buyers already got the branded invite above, so we don't double-email them.
  if (product && newlyGranted && !isNewUser) {
    await sendProductAccessEmail({
      to: email,
      fullName: fullName || null,
      productTitle: product.title,
      productUrl: `${url.origin}/products/${product.slug}`,
    })
  }

  // Mirror the sale into the Airtable Digital Product Hub (best-effort).
  // Records a product purchase (named from the LMS product) OR a tag-only
  // add-on (named from product_name in the payload). If neither a product nor
  // a product_name is present, there's nothing to name the sale, so skip.
  const saleName = product?.title || productName
  if (saleName) {
    const amountRaw = pick('amount', 'total', 'price', 'invoicetotal')
    await pushSaleToAirtable({
      email,
      fullName: fullName || null,
      productName: saleName,
      thrivecartId: productId || null,
      lmsSlug: productSlug || null,
      amount: amountRaw !== '' && !isNaN(Number(amountRaw)) ? Number(amountRaw) : null,
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
