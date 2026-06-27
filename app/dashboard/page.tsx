import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

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

  const productIds = (accessRows ?? []).map((r) => r.product_id)

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

function ProductCard({ product }: { product: { id: string; title: string; slug: string; description: string | null; cover_image_url: string | null } }) {
  return (
    <Link href={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(58,79,94,0.15)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--si-shadow-card)'
        }}
      >
        {/* Cover image or placeholder */}
        <div
          style={{
            height: 160,
            background: product.cover_image_url
              ? `url(${product.cover_image_url}) center/cover`
              : 'linear-gradient(135deg, var(--si-denim-blue) 0%, #2C3D4A 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '1rem',
          }}
        >
          <span
            style={{
              background: 'var(--si-burnt-orange)',
              color: 'white',
              fontSize: '0.75rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.625rem',
              borderRadius: 4,
            }}
          >
            Program
          </span>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '1.125rem',
              color: 'var(--si-dark-text)',
              marginBottom: '0.5rem',
              lineHeight: 1.3,
            }}
          >
            {product.title}
          </h2>
          {product.description && (
            <p
              style={{
                color: 'var(--si-muted)',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.description}
            </p>
          )}
          <div
            style={{
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--si-burnt-orange)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Open program →
          </div>
        </div>
      </div>
    </Link>
  )
}
