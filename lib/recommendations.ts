// Upsell resolver for the dashboard "You may also be interested in" row.
//
// RLS forbids a student from selecting products they don't own, so the set of
// recommendable products is resolved SERVER-SIDE with the service-role client
// and only whitelisted, non-sensitive fields are returned. Given the products a
// user owns, we gather each owned product's explicit recommendations (+ optional
// same-category suggestions), drop anything already owned or without a buy
// destination, dedupe, and cap the list.

import { createServiceSupabaseClient } from './supabase-service'

export interface RecommendedProduct {
  id: string
  title: string
  slug: string
  category: string | null
  cover_image_url: string | null
  thumbnail_color: string | null
  destinationUrl: string // checkout_url ?? sales_page_url (always present)
  ctaMode: 'new_tab' | 'lightbox'
  ctaLabel: string
}

const MAX_RECOMMENDATIONS = 6

const WHITELIST =
  'id, title, slug, category, cover_image_url, thumbnail_color, is_active, sales_page_url, checkout_url, upsell_cta_mode, upsell_cta_label'

export async function getRecommendedProducts(ownedProductIds: string[]): Promise<RecommendedProduct[]> {
  if (ownedProductIds.length === 0) return []

  // `database.types.ts` predates these columns, so cast to any (as the rest of
  // the app does for product queries).
  const db = createServiceSupabaseClient() as any
  const owned = new Set(ownedProductIds)

  // What the owned products recommend.
  const { data: ownedRows } = await db
    .from('products')
    .select('id, category, recommended_product_ids, recommend_same_category')
    .in('id', ownedProductIds)

  const explicitIds = new Set<string>()
  const sameCategories = new Set<string>()
  for (const p of ownedRows ?? []) {
    for (const rid of p.recommended_product_ids ?? []) {
      if (rid && !owned.has(rid)) explicitIds.add(rid)
    }
    if (p.recommend_same_category && p.category) sameCategories.add(p.category)
  }

  if (explicitIds.size === 0 && sameCategories.size === 0) return []

  const byId = new Map<string, RecommendedProduct>()
  const collect = (rows: any[]) => {
    for (const p of rows ?? []) {
      if (owned.has(p.id) || byId.has(p.id)) continue
      const destinationUrl = (p.checkout_url || '').trim() || (p.sales_page_url || '').trim()
      if (!destinationUrl) continue // no way to buy → not actionable, skip
      byId.set(p.id, {
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category ?? null,
        cover_image_url: p.cover_image_url ?? null,
        thumbnail_color: p.thumbnail_color ?? null,
        destinationUrl,
        ctaMode: p.upsell_cta_mode === 'lightbox' ? 'lightbox' : 'new_tab',
        ctaLabel: (p.upsell_cta_label || '').trim() || 'Unlock →',
      })
    }
  }

  // Explicit picks first (higher intent), then same-category fill-ins.
  if (explicitIds.size > 0) {
    const { data } = await db.from('products').select(WHITELIST).in('id', [...explicitIds]).eq('is_active', true)
    collect(data)
  }
  if (sameCategories.size > 0 && byId.size < MAX_RECOMMENDATIONS) {
    const { data } = await db.from('products').select(WHITELIST).in('category', [...sameCategories]).eq('is_active', true)
    collect(data)
  }

  return [...byId.values()].slice(0, MAX_RECOMMENDATIONS)
}
