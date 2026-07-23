'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendAffiliateWelcomeEmail } from '@/lib/email'
import { upsertAffiliateLink } from '@/lib/airtable'

async function getAdminClient() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

function toCode(raw: string) {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '')
}

// ── Affiliates (people) ─────────────────────────────────────────────────────
export async function createAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const name = (formData.get('name') as string).trim()
  const email = ((formData.get('email') as string) || '').trim() || null
  const rateRaw = ((formData.get('commission_rate') as string) || '').trim()
  const commission_rate = rateRaw ? Number(rateRaw) : 0
  if (!name) throw new Error('Name is required')
  if (isNaN(commission_rate) || commission_rate < 0 || commission_rate > 100) throw new Error('Commission rate must be 0–100')

  const { error } = await (db as any).from('affiliates').insert({ name, email, commission_rate })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}

export async function deleteAffiliate(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await (db as any).from('affiliates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}

// ── Links (per product) ─────────────────────────────────────────────────────
export async function createAffiliateLink(formData: FormData) {
  const db = await getAdminClient()
  const affiliate_id = formData.get('affiliate_id') as string
  const product_id = ((formData.get('product_id') as string) || '').trim() || null
  const typedDestination = ((formData.get('destination_url') as string) || '').trim()

  const { data: aff } = await (db as any).from('affiliates').select('name, email').eq('id', affiliate_id).single()
  if (!aff) throw new Error('Affiliate not found')

  // Idempotent: don't create a second link for the same affiliate+product (e.g.
  // a double-submit) — the self-service endpoint already reuses one, mirror that.
  if (product_id) {
    const { data: existing } = await (db as any).from('affiliate_links')
      .select('code').eq('affiliate_id', affiliate_id).eq('product_id', product_id).maybeSingle()
    if (existing) throw new Error(`This affiliate already has a link for this product ("${existing.code}") — edit or remove it instead of adding another.`)
  }

  // Look up the promoted product (for auto-code, the Airtable link label, and to
  // default the destination to the product's sales page — so you never retype it).
  let productSlug = '', productTitle = '', productSalesUrl = ''
  if (product_id) {
    const { data: p } = await (db as any).from('products').select('slug, title, sales_page_url').eq('id', product_id).single()
    productSlug = p?.slug ?? ''
    productTitle = p?.title ?? ''
    productSalesUrl = (p?.sales_page_url ?? '').trim()
  }

  // Blank destination → use the product's own sales page automatically.
  const destination_url = typedDestination || productSalesUrl
  if (!/^https?:\/\//.test(destination_url)) {
    throw new Error(product_id
      ? 'This product has no Sales page URL yet — add one on the product, or type a destination here.'
      : 'Pick a product (to use its sales page) or type a destination URL starting with http(s)://.')
  }

  // Code: explicit, else auto from affiliate name (+ product slug), made unique.
  let base = toCode((formData.get('code') as string) || '')
  if (!base) base = toCode(`${aff.name}${productSlug ? '-' + productSlug : ''}`) || 'link'
  const { data: taken } = await (db as any).from('affiliate_links').select('code').like('code', `${base}%`)
  const takenSet = new Set((taken ?? []).map((r: any) => r.code))
  let code = base
  for (let n = 2; takenSet.has(code); n++) code = `${base}-${n}`

  const { error } = await (db as any).from('affiliate_links').insert({ affiliate_id, product_id, code, destination_url })
  if (error) throw new Error(error.code === '23505' ? `Code "${code}" is already taken` : error.message)

  const host = (await headers()).get('host') ?? 'goodies.solutionintegrators.us'
  const link = `https://${host}/r/${code}`
  // Add this link as a row in the partner's Airtable "Affiliate Links" table.
  if (aff.email) {
    await upsertAffiliateLink({ partnerEmail: aff.email, product: productTitle || null, code, url: link })
    await sendAffiliateWelcomeEmail({ to: aff.email, name: aff.name || null, link })
  }
  revalidatePath('/admin/affiliates')
}

export async function toggleLink(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await (db as any).from('affiliate_links').update({ is_active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}

export async function deleteLink(formData: FormData) {
  const db = await getAdminClient()
  const id = formData.get('id') as string
  const { error } = await (db as any).from('affiliate_links').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/affiliates')
}
