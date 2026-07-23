export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import AffiliateApplyForm from '@/components/affiliate/AffiliateApplyForm'
import { branding } from '@/lib/branding'

export default async function AffiliateApplyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware handles redirect to /login

  const { data: profile } = await (supabase as any)
    .from('profiles').select('email, role, avatar_url, full_name').eq('id', user.id).single()

  const { data: productsRaw } = await (supabase as any)
    .from('products').select('id, title, sales_page_url').eq('is_active', true).order('title')
  const products = ((productsRaw ?? []) as any[])
    .filter((p) => /^https?:\/\//.test((p.sales_page_url ?? '').trim()))
    .map((p) => ({ id: p.id, title: p.title }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar
        email={profile?.email ?? user.email ?? ''}
        role={profile?.role ?? 'user'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '2rem', color: 'var(--si-denim-blue)', marginBottom: '0.75rem' }}>
          Become an Affiliate
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem', color: 'var(--si-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Apply to promote {branding.company} products and earn commission on referred sales. We review every
          application — you&apos;ll hear back once yours is approved.
        </p>
        <AffiliateApplyForm
          fullName={profile?.full_name ?? ''}
          email={profile?.email ?? user.email ?? ''}
          products={products}
        />
      </main>
    </div>
  )
}
