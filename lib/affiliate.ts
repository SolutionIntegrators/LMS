// Affiliate sale attribution. Two entry points converge on attributeSale():
//   1. recordAttributionFromCookie() — called on portal load; reads the aff_ref
//      cookie, records the buyer↔affiliate link, and converts if already bought.
//   2. the purchase webhooks — call attributeSale() right after granting access.
// All best-effort: attribution problems never block access or purchases.

import { createServiceSupabaseClient } from './supabase-service'
import { pushReferralPayout } from './airtable'

// Revenue-share partnerships: a partner earns a % on EVERY sale of a product
// (matched by product_id) or a named add-on (matched by label = product_name),
// independent of referral attribution. Deduped per (rule, transaction_ref), so
// it only fires when a transaction_ref is present and never double-pays.
export async function payoutRevenueShares(opts: {
  productId?: string | null
  label?: string | null      // the add-on product_name for tag-only sales
  saleName: string           // product title or add-on name (for the payout note)
  amount: number | null
  transactionRef: string
  buyerLabel: string
  today: string
}): Promise<void> {
  if (!opts.transactionRef) return // need a ref to dedupe safely
  try {
    const db = createServiceSupabaseClient()
    const rules: any[] = []
    if (opts.productId) {
      const { data } = await (db as any).from('product_revenue_shares').select('*').eq('product_id', opts.productId)
      rules.push(...(data ?? []))
    }
    if (opts.label) {
      const { data } = await (db as any).from('product_revenue_shares').select('*').ilike('label', opts.label)
      rules.push(...(data ?? []))
    }
    for (const rule of rules) {
      const rate = Number(rule.rate ?? 0)
      const commission = opts.amount != null && rate ? Number((opts.amount * rate / 100).toFixed(2)) : null
      // Dedupe: insert the payout log row; skip if this (rule, ref) already paid.
      const { data: inserted } = await (db as any).from('revenue_share_payouts').upsert({
        revenue_share_id: rule.id, transaction_ref: opts.transactionRef,
        buyer_email: opts.buyerLabel, amount: opts.amount, commission,
      }, { onConflict: 'revenue_share_id,transaction_ref', ignoreDuplicates: true }).select('id')
      if (!inserted || inserted.length === 0) continue // already paid

      await pushReferralPayout({
        partnerEmail: rule.partner_email,
        buyerLabel: opts.buyerLabel,
        productTitle: opts.saleName,
        saleAmount: opts.amount,
        commission,
        date: opts.today,
        sourceNote: `revenue-share partnership (${rate}%)`,
      })
    }
  } catch (err) {
    console.error('payoutRevenueShares failed:', err instanceof Error ? err.message : err)
  }
}

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
