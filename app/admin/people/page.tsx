export const runtime = 'edge'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PeopleTabs from '@/components/admin/people/PeopleTabs'

export default async function AdminPeoplePage() {
  const supabase = await createServerSupabaseClient()
  const base = `https://${(await headers()).get('host') ?? 'goodies.solutionintegrators.us'}`

  const [
    { data: profilesRaw },
    { data: accessRowsRaw },
    { data: productsRaw },
    { data: affRaw },
    { data: linkRaw },
    { data: clickRaw },
    { data: attrRaw },
  ] = await Promise.all([
    (supabase as any).from('profiles').select('id, email, full_name, role, tags, avatar_url, created_at, last_login_at').order('created_at', { ascending: false }),
    supabase.from('user_product_access').select('user_id, product_id, granted_at, products(title)'),
    supabase.from('products').select('id, title').order('title'),
    (supabase as any).from('affiliates').select('id, name, email, commission_rate, created_at').order('created_at', { ascending: false }),
    (supabase as any).from('affiliate_links').select('id, affiliate_id, product_id, code, destination_url, is_active'),
    (supabase as any).from('affiliate_clicks').select('link_id'),
    (supabase as any).from('referral_attributions').select('affiliate_id, converted_at, sale_amount, commission_amount'),
  ])

  const profiles = (profilesRaw ?? []) as any[]
  const accessRows = (accessRowsRaw ?? []) as any[]
  const products = (productsRaw ?? []) as any[]

  const accessByUser = accessRows.reduce<Record<string, Array<{ product_id: string; title: string }>>>((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = []
    acc[row.user_id].push({ product_id: row.product_id, title: (row.products as any)?.title ?? '—' })
    return acc
  }, {})

  const users = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    tags: p.tags ?? [],
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    last_login_at: p.last_login_at,
    programs: accessByUser[p.id] ?? [],
  }))

  // ── Affiliates ──────────────────────────────────────────────────────────────
  const affiliates = (affRaw ?? []) as any[]
  const links = (linkRaw ?? []) as any[]
  const productName = new Map(products.map((p) => [p.id, p.title]))

  const clicksByLink = new Map<string, number>()
  for (const c of (clickRaw ?? []) as any[]) clicksByLink.set(c.link_id, (clicksByLink.get(c.link_id) ?? 0) + 1)

  const summary = new Map<string, { sales: number; commission: number }>()
  for (const a of (attrRaw ?? []) as any[]) {
    if (!a.converted_at) continue
    const s = summary.get(a.affiliate_id) ?? { sales: 0, commission: 0 }
    s.sales += 1
    s.commission += Number(a.commission_amount ?? 0)
    summary.set(a.affiliate_id, s)
  }

  const linksByAffiliate = new Map<string, any[]>()
  for (const l of links) {
    const arr = linksByAffiliate.get(l.affiliate_id) ?? []
    arr.push(l)
    linksByAffiliate.set(l.affiliate_id, arr)
  }

  const affiliatesWithData = affiliates.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    commission_rate: a.commission_rate,
    sales: summary.get(a.id)?.sales ?? 0,
    commissionEarned: summary.get(a.id)?.commission ?? 0,
    links: (linksByAffiliate.get(a.id) ?? []).map((l) => ({
      id: l.id,
      code: l.code,
      is_active: l.is_active,
      productTitle: l.product_id ? (productName.get(l.product_id) ?? '—') : null,
      clicks: clicksByLink.get(l.id) ?? 0,
      url: `${base}/r/${l.code}`,
    })),
  }))

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.5rem' }}>
        People
      </h1>

      <PeopleTabs users={users} products={products} affiliates={affiliatesWithData} />
    </div>
  )
}
