// Shared purchase pipeline used by every payment source (Dubsado→Zapier and
// Stripe). Given a normalized purchase, it: looks up the product by slug,
// finds-or-invites the buyer, grants access (storing the amount), applies tags,
// logs activity, tags in Kit, runs affiliate attribution + revenue-share, emails
// existing customers, and mirrors the sale to Airtable. All best-effort side
// effects never block the core grant.

import { createServiceSupabaseClient } from './supabase-service'
import { pushSaleToAirtable } from './airtable'
import { sendProductAccessEmail } from './email'
import { tagSubscriber } from './kit'
import { attributeSale, payoutRevenueShares } from './affiliate'

export interface PurchaseInput {
  email: string
  fullName?: string | null
  productSlug?: string | null       // grant access to this product
  explicitTags?: string[]           // extra profile tags (tag-only add-ons)
  productName?: string | null       // label for a tag-only add-on sale
  kitTagOverride?: string | null
  amount?: number | null
  transactionRef?: string | null
  source: string                    // grant provenance, e.g. 'stripe_webhook'
  airtableSource: 'Zapier' | 'Stripe' | 'Manual' | 'LMS'
  origin: string                    // base URL for links in emails
  today: string                     // YYYY-MM-DD
}

export interface PurchaseResult {
  status: number
  body: Record<string, any>
}

export async function processPurchase(opts: PurchaseInput): Promise<PurchaseResult> {
  const email = (opts.email || '').trim()
  const fullName = (opts.fullName || '').trim()
  const productSlug = (opts.productSlug || '').trim()
  const explicitTags = (opts.explicitTags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean)
  const saleAmount = opts.amount ?? null
  const transactionRef = (opts.transactionRef || '').trim()
  const today = opts.today

  if (!email) return { status: 400, body: { error: 'email is required' } }
  if (!productSlug && explicitTags.length === 0) {
    return { status: 400, body: { error: 'product_slug or tags is required' } }
  }

  const db = createServiceSupabaseClient()

  // Product (by slug). A tags-only add-on skips this.
  let product: any = null
  if (productSlug) {
    const { data } = await db.from('products').select('id, title, slug, auto_grant_tags, kit_tag_id').eq('slug', productSlug).single()
    product = data
    if (!product) return { status: 404, body: { error: `No product found for slug "${productSlug}"` } }
  }

  // Find or invite the buyer.
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
      const { data: newUser, error } = await db.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { full_name: fullName || undefined },
      })
      if (error || !newUser.user) return { status: 500, body: { error: `Failed to create user: ${error?.message ?? inviteErr?.message}` } }
      userId = newUser.user.id
    }
    await db.from('profiles').upsert({ id: userId, email, full_name: fullName || null, role: 'user' }, { onConflict: 'id' })
  }

  // Grant access (amount stored; newly-inserted detection for one-time emails).
  let newlyGranted = false
  if (product) {
    const { data: grantedRows, error: accessError } = await db.from('user_product_access').upsert({
      user_id: userId, product_id: product.id, granted_by: opts.source,
      transaction_ref: transactionRef || null, granted_at: new Date().toISOString(), amount: saleAmount,
    } as any, { onConflict: 'user_id,product_id', ignoreDuplicates: true }).select('id')
    if (accessError) return { status: 500, body: { error: `Failed to grant access: ${accessError.message}` } }
    newlyGranted = Array.isArray(grantedRows) && grantedRows.length > 0
  }

  // Tags (product auto-grant + explicit).
  const tagsToAdd = [...new Set([...(product?.auto_grant_tags ?? []), ...explicitTags])] as string[]
  if (tagsToAdd.length > 0) {
    const { data: profileData } = await (db as any).from('profiles').select('tags').eq('id', userId).single()
    const existingTags: string[] = profileData?.tags ?? []
    await (db as any).from('profiles').update({ tags: [...new Set([...existingTags, ...tagsToAdd])] }).eq('id', userId)
  }

  await db.from('activity_logs').insert({
    user_id: userId, product_id: product?.id ?? null,
    event_type: product ? 'purchase' : 'tag_grant',
    metadata: { source: opts.source, email, transaction_ref: transactionRef, full_name: fullName, tags: tagsToAdd },
  })

  // Kit tagging (best-effort, idempotent).
  const kitTagIds = new Set<string | number>()
  if (product?.kit_tag_id) kitTagIds.add(product.kit_tag_id)
  if (opts.kitTagOverride) kitTagIds.add(opts.kitTagOverride)
  for (const t of kitTagIds) await tagSubscriber(t, email)

  // Affiliate attribution (only-linked-product scope).
  if (product) await attributeSale(userId, product.id, saleAmount, today)

  // Revenue-share partnerships.
  const buyerLabel = fullName || email
  await payoutRevenueShares({
    productId: product?.id ?? null,
    label: product ? null : (opts.productName || null),
    tags: tagsToAdd,
    saleName: product?.title || opts.productName || 'Purchase',
    amount: saleAmount, transactionRef, buyerLabel, today,
  })

  // Notify existing customers of new access (new buyers already got the invite).
  if (product && newlyGranted && !isNewUser) {
    await sendProductAccessEmail({ to: email, fullName: fullName || null, productTitle: product.title, productUrl: `${opts.origin}/products/${product.slug}` })
  }

  // Mirror to Airtable (best-effort).
  const saleName = product?.title || opts.productName
  if (saleName) {
    await pushSaleToAirtable({
      email, fullName: fullName || null, productName: saleName,
      lmsSlug: productSlug || null, amount: saleAmount,
      source: opts.airtableSource, transactionRef,
    })
  }

  return {
    status: 200,
    body: {
      ok: true,
      message: product
        ? `Access granted: ${email} → ${product.title}${tagsToAdd.length ? ` (tags: ${tagsToAdd.join(', ')})` : ''}`
        : `Tags added: ${email} → ${tagsToAdd.join(', ')}`,
      user_id: userId, product_id: product?.id ?? null, tags_added: tagsToAdd,
    },
  }
}
