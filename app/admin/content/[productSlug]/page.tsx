export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  createModule, updateModule, deleteModule, reorderModule,
  createLesson, deleteLesson, reorderLesson,
  updateProduct, deleteProduct,
} from '../actions'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  fontFamily: 'DM Sans, sans-serif',
  width: '100%',
}

const btnSm: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.75rem',
  fontWeight: 500,
  padding: '0.25rem 0.625rem',
  borderRadius: 5,
  border: '1px solid var(--si-border)',
  background: 'var(--si-white)',
  color: 'var(--si-dark-text)',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}

const btnDanger: React.CSSProperties = {
  ...btnSm,
  color: '#8B2A1A',
  borderColor: '#f5c6c0',
  background: '#FDF0EE',
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productSlug: string }> }) {
  const { productSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', productSlug)
    .single()

  if (!product) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(id, title, sort_order, is_published, content_type)')
    .eq('product_id', product.id)
    .order('sort_order')

  const sortedModules = (modules ?? []).map((m) => ({
    ...m,
    lessons: [...(m.lessons as any[])].sort((a, b) => a.sort_order - b.sort_order),
  }))

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', marginBottom: '1.25rem' }}>
        <Link href="/admin/content" style={{ color: 'var(--si-burnt-orange)', textDecoration: 'none' }}>Products</Link>
        {' → '}
        {product.title}
      </div>

      {/* Product settings */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
          Product Settings
        </h2>
        <form action={updateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
          <input type="hidden" name="id" value={product.id} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title</span>
            <input name="title" defaultValue={product.title} required style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>ThriveCart Product ID</span>
            <input name="thrivecart_product_id" defaultValue={product.thrivecart_product_id ?? ''} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
              <input type="hidden" name="is_active" value="false" />
              <input type="checkbox" name="is_active" value="true" defaultChecked={product.is_active ?? false}
                style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
              Active (visible to students)
            </label>
            <button type="submit" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              Save
            </button>
          </div>
        </form>
        <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--si-border)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxWidth: 480 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Description</span>
            <textarea name="description" form="product-save" defaultValue={product.description ?? ''}
              rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
        </div>
        <form id="product-delete" action={deleteProduct} style={{ marginTop: '1rem' }}>
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" style={btnDanger}
            onClick={(e) => { if (!confirm('Delete this product and all its modules and lessons?')) e.preventDefault() }}>
            Delete product
          </button>
        </form>
      </div>

      {/* Modules */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.4rem', color: 'var(--si-denim-blue)' }}>
          Modules ({sortedModules.length})
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {sortedModules.map((mod, modIdx) => (
          <div key={mod.id} className="card" style={{ padding: '1.25rem' }}>
            {/* Module header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
              {/* Reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <form action={reorderModule}>
                  <input type="hidden" name="id" value={mod.id} />
                  <input type="hidden" name="direction" value="up" />
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="productSlug" value={productSlug} />
                  <button type="submit" style={btnSm} disabled={modIdx === 0}>↑</button>
                </form>
                <form action={reorderModule}>
                  <input type="hidden" name="id" value={mod.id} />
                  <input type="hidden" name="direction" value="down" />
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="productSlug" value={productSlug} />
                  <button type="submit" style={btnSm} disabled={modIdx === sortedModules.length - 1}>↓</button>
                </form>
              </div>

              {/* Rename */}
              <form action={updateModule} style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="hidden" name="id" value={mod.id} />
                <input type="hidden" name="productSlug" value={productSlug} />
                <input name="title" defaultValue={mod.title} required style={{ ...inputStyle, flex: 1, fontSize: '0.95rem', fontWeight: 600 }} />
                <button type="submit" style={btnSm}>Rename</button>
              </form>

              {/* Delete */}
              <form action={deleteModule}>
                <input type="hidden" name="id" value={mod.id} />
                <input type="hidden" name="productSlug" value={productSlug} />
                <button type="submit" style={btnDanger}
                  onClick={(e) => { if (!confirm('Delete this module and all its lessons?')) e.preventDefault() }}>
                  Delete
                </button>
              </form>
            </div>

            {/* Lessons */}
            <div style={{ paddingLeft: '2.5rem' }}>
              {mod.lessons.length === 0 && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-muted)', marginBottom: '0.75rem' }}>
                  No lessons yet.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem' }}>
                {mod.lessons.map((lesson: any, lessonIdx: number) => (
                  <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', background: 'var(--si-linen)', borderRadius: 6 }}>
                    {/* Reorder */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <form action={reorderLesson}>
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="direction" value="up" />
                        <input type="hidden" name="module_id" value={mod.id} />
                        <input type="hidden" name="productSlug" value={productSlug} />
                        <button type="submit" style={{ ...btnSm, padding: '0.125rem 0.4rem' }} disabled={lessonIdx === 0}>↑</button>
                      </form>
                      <form action={reorderLesson}>
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="direction" value="down" />
                        <input type="hidden" name="module_id" value={mod.id} />
                        <input type="hidden" name="productSlug" value={productSlug} />
                        <button type="submit" style={{ ...btnSm, padding: '0.125rem 0.4rem' }} disabled={lessonIdx === mod.lessons.length - 1}>↓</button>
                      </form>
                    </div>

                    <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>
                      {lesson.title}
                    </span>

                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                      background: lesson.is_published ? '#EDF7F0' : 'var(--si-border)',
                      color: lesson.is_published ? '#1A6B3C' : 'var(--si-muted)',
                    }}>
                      {lesson.is_published ? 'Published' : 'Draft'}
                    </span>

                    {lesson.content_type && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--si-muted)', fontFamily: 'monospace' }}>
                        {lesson.content_type}
                      </span>
                    )}

                    <Link href={`/admin/content/${productSlug}/lessons/${lesson.id}`} style={{ ...btnSm, textDecoration: 'none', display: 'inline-block' }}>
                      Edit
                    </Link>

                    <form action={deleteLesson}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <input type="hidden" name="productSlug" value={productSlug} />
                      <button type="submit" style={btnDanger}
                        onClick={(e) => { if (!confirm('Delete this lesson?')) e.preventDefault() }}>
                        ✕
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Add lesson */}
              <form action={createLesson} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="hidden" name="module_id" value={mod.id} />
                <input type="hidden" name="productSlug" value={productSlug} />
                <input name="title" required placeholder="New lesson title" style={{ ...inputStyle, fontSize: '0.85rem', flex: 1 }} />
                <button type="submit" style={{ ...btnSm, background: 'var(--si-denim-blue)', color: 'white', border: 'none' }}>
                  + Add Lesson
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* Add module */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: 'var(--si-denim-blue)', marginBottom: '0.75rem' }}>
          Add Module
        </h3>
        <form action={createModule} style={{ display: 'flex', gap: '0.75rem' }}>
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="productSlug" value={productSlug} />
          <input name="title" required placeholder="Module title" style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Add Module</button>
        </form>
      </div>
    </div>
  )
}
