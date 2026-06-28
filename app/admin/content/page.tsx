export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { createProduct } from './actions'

const cell: React.CSSProperties = { padding: '0.75rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' as const }

export default async function AdminContentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, title, slug, is_active, thrivecart_product_id, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)' }}>
          Products ({products?.length ?? 0})
        </h1>
      </div>

      {/* Add product form */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
          Add Product
        </h2>
        <form action={createProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title *</span>
            <input name="title" required placeholder="e.g. Systems Bootcamp" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>ThriveCart Product ID</span>
            <input name="thrivecart_product_id" placeholder="optional" style={inputStyle} />
          </label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Add Product
          </button>
        </form>
      </div>

      {/* Products table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Slug</th>
              <th style={th}>Status</th>
              <th style={th}>ThriveCart ID</th>
              <th style={th}>Created</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                <td style={{ ...cell, fontWeight: 500, color: 'var(--si-dark-text)' }}>{p.title}</td>
                <td style={{ ...cell, color: 'var(--si-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.slug}</td>
                <td style={cell}>
                  <span style={{
                    background: p.is_active ? '#EDF7F0' : 'var(--si-linen)',
                    color: p.is_active ? '#1A6B3C' : 'var(--si-muted)',
                    padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600
                  }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ ...cell, color: 'var(--si-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.thrivecart_product_id ?? '—'}</td>
                <td style={{ ...cell, color: 'var(--si-muted)', whiteSpace: 'nowrap' }}>{new Date(p.created_at!).toLocaleDateString()}</td>
                <td style={cell}>
                  <Link href={`/admin/content/${p.slug}`} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products?.length && (
          <p style={{ textAlign: 'center', color: 'var(--si-muted)', padding: '3rem', fontFamily: 'DM Sans, sans-serif' }}>
            No products yet. Add one above.
          </p>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
}
