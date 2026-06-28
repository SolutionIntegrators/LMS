export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import ProductCard from '@/components/ProductCard'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Update last_login_at and upsert profile on password login path
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email!,
    last_login_at: new Date().toISOString(),
  }, { onConflict: 'id', ignoreDuplicates: false })

  // Fetch product IDs the user has access to
  const { data: accessRows } = await supabase
    .from('user_product_access')
    .select('product_id')
    .eq('user_id', user.id)

  const productIds = (accessRows ?? []).map((r) => r.product_id).filter((id): id is string => id !== null)

  const products: Array<{
    id: string
    title: string
    slug: string
    description: string | null
    cover_image_url: string | null
  }> = []

  if (productIds.length > 0) {
    const { data: productRows } = await supabase
      .from('products')
      .select('id, title, slug, description, cover_image_url')
      .in('id', productIds)
      .eq('is_active', true)
      .order('title')
    products.push(...(productRows ?? []))
  }

  // Fetch profile for display
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar email={profile?.email ?? user.email ?? ''} role={profile?.role ?? 'user'} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 400,
              color: 'var(--si-denim-blue)',
              lineHeight: 1.2,
              marginBottom: '0.5rem',
            }}
          >
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--si-muted)', fontSize: '1rem' }}>
            {products.length === 0
              ? 'Your purchased programs will appear here.'
              : `You have access to ${products.length} program${products.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {products.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              maxWidth: 520,
              margin: '0 auto',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--si-denim-blue)', marginBottom: '0.75rem' }}>
              No programs yet
            </h2>
            <p style={{ color: 'var(--si-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Once you purchase a program, it will appear here automatically. Check your email for a login link if you just bought something.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

          </div>
        )}
      </main>
    </div>
  )
}

