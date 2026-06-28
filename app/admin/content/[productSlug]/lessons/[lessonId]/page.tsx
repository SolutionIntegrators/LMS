export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { updateLesson } from '../../../actions'
import LessonFileUpload from './LessonFileUpload'
import LessonContentFields from './LessonContentFields'

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

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
}

const labelText: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--si-muted)',
}

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ productSlug: string; lessonId: string }>
}) {
  const { productSlug, lessonId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, modules(title, product_id, products(title, slug))')
    .eq('id', lessonId)
    .single()

  if (!lesson) return <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>Lesson not found.</div>

  const module = lesson.modules as any
  const product = module?.products as any

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Breadcrumb */}
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', marginBottom: '1.5rem' }}>
        <Link href="/admin/content" style={{ color: 'var(--si-burnt-orange)', textDecoration: 'none' }}>Products</Link>
        {' → '}
        <Link href={`/admin/content/${productSlug}`} style={{ color: 'var(--si-burnt-orange)', textDecoration: 'none' }}>{product?.title ?? productSlug}</Link>
        {' → '}
        {module?.title}
        {' → '}
        {lesson.title}
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.5rem', color: 'var(--si-denim-blue)', marginBottom: '1.75rem' }}>
          Edit Lesson
        </h1>

        <form action={updateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input type="hidden" name="id" value={lesson.id} />

          <label style={labelStyle}>
            <span style={labelText}>Title *</span>
            <input name="title" defaultValue={lesson.title} required style={inputStyle} />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Description</span>
            <textarea name="description" defaultValue={lesson.description ?? ''} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          {/* Dynamic content type + URL fields */}
          <LessonContentFields
            defaultType={lesson.content_type}
            defaultUrl={lesson.content_url}
          />

          {/* R2 file upload */}
          <LessonFileUpload lessonId={lesson.id} currentUrl={lesson.content_url} />

          {/* Access control */}
          <div style={{ background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: 'var(--si-denim-blue)', margin: 0 }}>
              Access Control
            </p>
            <label style={labelStyle}>
              <span style={labelText}>Required tag (leave blank = all students with product access)</span>
              <input
                name="required_tag"
                defaultValue={(lesson as any).required_tag ?? ''}
                placeholder="e.g. vip, tier2, bonus"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
              <input type="checkbox" name="is_published" defaultChecked={lesson.is_published}
                style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
              Published (visible to students)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)', cursor: 'pointer' }}>
              <input type="checkbox" name="is_preview" defaultChecked={(lesson as any).is_preview ?? false}
                style={{ width: 16, height: 16, accentColor: 'var(--si-burnt-orange)' }} />
              Free preview (anyone logged in can watch without purchasing)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--si-border)' }}>
            <button type="submit" className="btn-primary">Save Lesson</button>
            <Link href={`/admin/content/${productSlug}`} style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)',
              textDecoration: 'none', display: 'flex', alignItems: 'center',
            }}>
              ← Back to product
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
