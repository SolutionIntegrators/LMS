export const runtime = 'edge'


import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import ProductCard from '@/components/ProductCard'
import WelcomeBanner from '@/components/WelcomeBanner'
import { recordAttributionFromCookie, ATTR_COOKIE } from '@/lib/affiliate'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware handles redirect to /login

  // Affiliate attribution: if this browser carries an aff_ref cookie, record it
  // and convert any matching purchase (best-effort — never blocks the page).
  const affRef = (await cookies()).get(ATTR_COOKIE)?.value
  if (affRef) await recordAttributionFromCookie(user.id, affRef, new Date().toISOString().slice(0, 10))

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
    thumbnail_url: string | null
    thumbnail_color: string | null
  }> = []

  if (productIds.length > 0) {
    const { data: productRows } = await supabase
      .from('products')
      .select('id, title, slug, description, cover_image_url, thumbnail_url, thumbnail_color')
      .in('id', productIds)
      .eq('is_active', true)
      .order('title')
    products.push(...(productRows ?? []))
  }

  // Fetch profile and announcement in parallel
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single(),
    (supabase as any).from('site_settings').select('key, value'),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
  const announcementActive = settingsMap['announcement_active'] === 'true'
  const announcementText = settingsMap['announcement_text'] ?? ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar email={(profile as any)?.email ?? user.email ?? ''} role={(profile as any)?.role ?? 'user'} />

      {/* Announcement bar */}
      {announcementActive && announcementText && (
        <div style={{
          background: 'var(--si-burnt-orange)',
          color: 'white',
          textAlign: 'center',
          padding: '0.75rem 1.5rem',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.9375rem',
          fontWeight: 500,
          lineHeight: 1.5,
        }}>
          {announcementText}
        </div>
      )}

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <WelcomeBanner />
        </div>

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
            {(profile as any)?.full_name ? `Welcome back, ${(profile as any).full_name.split(' ')[0]}` : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--si-muted)', fontSize: '1rem' }}>
            {products.length === 0
              ? 'Your goodies will appear here once you make a purchase.'
              : `You have access to ${products.length} goodie${products.length === 1 ? '' : 's'}.`}
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
              No goodies yet
            </h2>
            <p style={{ color: 'var(--si-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Once you purchase something, it will appear here automatically. Check your email for a login link if you just bought something.
            </p>
            <a
              href="https://www.solutionintegrators.us/shop"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '1.25rem',
                padding: '0.625rem 1.5rem',
                background: 'var(--si-burnt-orange)',
                color: 'white',
                borderRadius: 'var(--si-radius-sm)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              Browse the Shop
            </a>
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

