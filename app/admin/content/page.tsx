export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { createProduct, setProductCategory } from './actions'

const cell: React.CSSProperties = { padding: '0.625rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem' }
const th: React.CSSProperties = { ...cell, color: 'var(--si-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '2px solid var(--si-border)', textAlign: 'left' as const }

const inputSm: React.CSSProperties = {
  border: '1px solid var(--si-border)', borderRadius: 4, padding: '0.3rem 0.5rem',
  fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)', background: 'var(--si-white)',
}
const btnSm: React.CSSProperties = {
  fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid var(--si-border)',
  background: 'var(--si-white)', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'DM Sans, sans-serif', color: 'var(--si-dark-text)',
}
const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 0.875rem',
  fontSize: '0.9rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif',
}

const UNCATEGORIZED = 'Uncategorized'

export default async function AdminContentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: productsRaw } = await (supabase.from('products') as any)
    .select('id, title, slug, is_active, thrivecart_product_id, category, created_at')
    .order('title')
  const products = (productsRaw ?? []) as any[]

  // Distinct existing categories (for the datalist autocomplete)
  const categoryNames = Array.from(
    new Set(products.map((p) => (p.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  // Group: named categories A→Z, then Uncategorized last
  const groups = new Map<string, any[]>()
  for (const c of categoryNames) groups.set(c, [])
  groups.set(UNCATEGORIZED, [])
  for (const p of products) {
    const key = (p.category || '').trim() || UNCATEGORIZED
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  // Drop empty groups, keep Uncategorized last
  const orderedGroups = [...groups.entries()].filter(([, list]) => list.length > 0)
  orderedGroups.sort((a, b) => {
    if (a[0] === UNCATEGORIZED) return 1
    if (b[0] === UNCATEGORIZED) return -1
    return a[0].localeCompare(b[0])
  })

  return (
    <div>
      <datalist id="category-options">
        {categoryNames.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.75rem', color: 'var(--si-denim-blue)' }}>
          Products ({products.length})
        </h1>
      </div>

      {/* Add product */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
          Add Product
        </h2>
        <form action={createProduct} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title *</span>
            <input name="title" required placeholder="e.g. Systems Bootcamp" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Category</span>
            <input name="category" list="category-options" placeholder="e.g. Dubsado, Airtable…" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>ThriveCart ID</span>
            <input name="thrivecart_product_id" placeholder="optional" style={inputStyle} />
          </label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Product</button>
        </form>
      </div>

      {products.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          No products yet. Add one above.
        </div>
      )}

      {/* Grouped product tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {orderedGroups.map(([groupName, list]) => (
          <div key={groupName}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--si-denim-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {groupName}
              </h2>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'var(--si-muted)' }}>({list.length})</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Title</th>
                    <th style={th}>Status</th>
                    <th style={th}>ThriveCart</th>
                    <th style={th}>Move to category</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--si-border)', background: i % 2 === 0 ? 'var(--si-white)' : 'transparent' }}>
                      <td style={{ ...cell, fontWeight: 500, color: 'var(--si-dark-text)' }}>{p.title}</td>
                      <td style={cell}>
                        <span style={{ background: p.is_active ? '#EDF7F0' : 'var(--si-linen)', color: p.is_active ? '#1A6B3C' : 'var(--si-muted)', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...cell, color: 'var(--si-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.thrivecart_product_id ?? '—'}</td>
                      <td style={cell}>
                        <form action={setProductCategory} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          <input type="hidden" name="id" value={p.id} />
                          <input name="category" list="category-options" defaultValue={p.category ?? ''} placeholder="Uncategorized" style={{ ...inputSm, width: 150 }} />
                          <button type="submit" style={btnSm}>Save</button>
                        </form>
                      </td>
                      <td style={{ ...cell, textAlign: 'right' }}>
                        <Link href={`/admin/content/${p.slug}`} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
