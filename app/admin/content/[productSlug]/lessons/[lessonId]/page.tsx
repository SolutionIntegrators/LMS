export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import LessonEditForm from './LessonEditForm'
import { parseBlocks } from '@/lib/blocks'

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

      <LessonEditForm
        lesson={{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          content_type: lesson.content_type,
          content_url: lesson.content_url,
          is_published: lesson.is_published,
          is_preview: (lesson as any).is_preview ?? false,
          required_tag: (lesson as any).required_tag ?? null,
          content_blocks: parseBlocks((lesson as any).content_blocks),
        }}
        productSlug={productSlug}
      />
    </div>
  )
}
