// Affiliate sale attribution. Two entry points converge on attributeSale():
//   1. recordAttributionFromCookie() — called on portal load; reads the aff_ref
//      cookie, records the buyer↔affiliate link, and converts if already bought.
//   2. the purchase webhooks — call attributeSale() right after granting access.
// All best-effort: attribution problems never block access or purchases.

import { createServiceSupabaseClient } from './supabase-service'
import { pushReferralPayout } from './airtable'

const ATTR_COOKIE = 'aff_ref'

// Turn an un-converted attribution into a payout once the buyer owns the product.
export async function attributeSale(userId: string, productId: string, amount: number | null, today: string): Promise<void> {
  try {
    const db = createServiceSupabaseClient()
    const { data: attr } = await (db as any)
      .from('referral_attributions')
      .select('id, affiliate_id, code, converted_at')
      .eq('user_id', userId).eq('product_id', productId).is('converted_at', null)
      .maybeSingle()
    if (!attr) return

    // Resolve the sale amount if not supplied (e.g. converting at login-time).
    let saleAmount = amount
    if (saleAmount == null) {
      const { data: upa } = await (db as any)
        .from('user_product_access').select('amount')
        .eq('user_id', userId).eq('product_id', productId).maybeSingle()
      saleAmount = upa?.amount ?? null
    }

    const { data: aff } = await (db as any)
      .from('affiliates').select('email, commission_rate').eq('id', attr.affiliate_id).maybeSingle()
    const rate = Number(aff?.commission_rate ?? 0)
    const commission = saleAmount != null && rate ? Number((saleAmount * rate / 100).toFixed(2)) : null

    const { data: prof } = await db.from('profiles').select('email, full_name').eq('id', userId).maybeSingle()
    const { data: product } = await db.from('products').select('title').eq('id', productId).maybeSingle()

    // Mark converted first so concurrent webhook + login runs can't double-pay.
    const { data: updated } = await (db as any)
      .from('referral_attributions')
      .update({ converted_at: today + 'T00:00:00Z', sale_amount: saleAmount, commission_amount: commission })
      .eq('id', attr.id).is('converted_at', null).select('id')
    if (!updated || updated.length === 0) return // someone else converted it

    await pushReferralPayout({
      partnerEmail: (aff as any)?.email ?? null,
      buyerLabel: (prof as any)?.full_name || (prof as any)?.email || 'Referred buyer',
      productTitle: (product as any)?.title ?? null,
      saleAmount,
      commission,
      code: (attr as any).code ?? null,
      date: today,
    })
  } catch (err) {
    console.error('attributeSale failed:', err instanceof Error ? err.message : err)
  }
}

// Read the aff_ref cookie on portal load, record the attribution (last-click,
// unless already converted), and convert immediately if the buyer already owns
// the linked product (the common "bought first, then logged in" path).
export async function recordAttributionFromCookie(userId: string, cookieValue: string | undefined, today: string): Promise<void> {
  const code = (cookieValue || '').trim().toLowerCase()
  if (!code) return
  try {
    const db = createServiceSupabaseClient()
    const { data: link } = await (db as any)
      .from('affiliate_links').select('id, affiliate_id, product_id, is_active')
      .eq('code', code).maybeSingle()
    if (!link || !link.is_active || !link.product_id) return // need a product to attribute to

    const { data: existing } = await (db as any)
      .from('referral_attributions').select('id, converted_at')
      .eq('user_id', userId).eq('product_id', link.product_id).maybeSingle()

    if (existing?.converted_at) return // already paid — don't reassign
    if (existing) {
      await (db as any).from('referral_attributions')
        .update({ affiliate_id: link.affiliate_id, link_id: link.id, code }).eq('id', existing.id)
    } else {
      await (db as any).from('referral_attributions').insert({
        user_id: userId, affiliate_id: link.affiliate_id, link_id: link.id, product_id: link.product_id, code,
      })
    }

    // Bought before logging in? Convert now.
    const { data: upa } = await (db as any)
      .from('user_product_access').select('amount')
      .eq('user_id', userId).eq('product_id', link.product_id).maybeSingle()
    if (upa) await attributeSale(userId, link.product_id, upa.amount ?? null, today)
  } catch (err) {
    console.error('recordAttributionFromCookie failed:', err instanceof Error ? err.message : err)
  }
}

export { ATTR_COOKIE }
