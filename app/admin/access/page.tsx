import { createServerSupabaseClient } from '@/lib/supabase-server'
import AccessManager from '@/components/AccessManager'

export default async function AdminAccessPage() {
  const supabase = await createServerSupabaseClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, title, slug')
    .eq('is_active', true)
    .order('title')

  const { data: accessRows } = await supabase
    .from('user_product_access')
    .select('id, granted_at, granted_by, transaction_ref, profiles(email), products(title, slug)')
    .order('granted_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
        Manage Access
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <AccessManager products={products ?? []} />

        {/* Current access grants */}
        <div>
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-dark-text)', marginBottom: '1rem' }}>
            Recent grants
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(accessRows ?? []).map((row) => (
              <div key={row.id} className="card" style={{ padding: '0.875rem 1rem' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: 'var(--si-dark-text)', marginBottom: '0.25rem' }}>
                  {(row.profiles as any)?.email ?? '—'}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)' }}>
                  {(row.products as any)?.title ?? '—'} · {row.granted_by ?? 'manual'} · {new Date(row.granted_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {!accessRows?.length && (
              <p style={{ color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>No access grants yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
