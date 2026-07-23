export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import SupportBoard from '@/components/support/SupportBoard'
import { getMyRequests, getMyProducts } from './actions'

export default async function SupportPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware handles redirect to /login

  const { data: profile } = await (supabase as any)
    .from('profiles').select('email, role, avatar_url').eq('id', user.id).single()

  const [requests, products] = await Promise.all([getMyRequests(), getMyProducts()])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar
        email={profile?.email ?? user.email ?? ''}
        role={profile?.role ?? 'user'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '2rem', color: 'var(--si-denim-blue)', marginBottom: '2rem' }}>
          Support
        </h1>
        <SupportBoard initialRequests={requests} products={products} />
      </main>
    </div>
  )
}
