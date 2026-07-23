export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createProduct } from './actions'
import ContentTable from '@/components/admin/content/ContentTable'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 0.875rem',
  fontSize: '0.9rem', color: 'var(--si-dark-text)', background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif',
}

export default async function AdminContentPage() {
  const supabase = await createServerSupabaseClient()
  const { data: productsRaw } = await (supabase.from('products') as any)
    .select('id, title, slug, is_active, category, created_at')
    .order('title')
  const products = (productsRaw ?? []) as any[]

  // Distinct existing categories (for the datalist autocomplete)
  const categoryNames = Array.from(
    new Set(products.map((p) => (p.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

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
        <form action={createProduct} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title *</span>
            <input name="title" required placeholder="e.g. Systems Bootcamp" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Category</span>
            <input name="category" list="category-options" placeholder="e.g. Dubsado, Airtable…" style={inputStyle} />
          </label>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Product</button>
        </form>
      </div>

      {products.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          No products yet. Add one above.
        </div>
      ) : (
        <ContentTable products={products} />
      )}
    </div>
  )
}
