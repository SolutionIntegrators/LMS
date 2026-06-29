export const runtime = 'edge'


import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import LessonPlayer from '@/components/LessonPlayer'
import Link from 'next/link'

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { id } = await params
  const { preview: previewParam } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware handles redirect to /login

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role, tags')
    .eq('id', user.id)
    .single()

  const profileData = profile as any
  const preview = previewParam === '1' && profileData?.role === 'admin'
  const previewQS = preview ? '?preview=1' : ''

  // Fetch lesson with module and product
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      id, title, description, content_type, content_url, sort_order, required_tag, is_preview,
      modules (
        id, title, product_id,
        products (id, title, slug)
      )
    `)
    .eq('id', id)
    .single()

  if (!lesson) return <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)' }}>Lesson not found.</div>

  const mod = lesson.modules as any
  const product = mod?.products as any
  const lessonData = lesson as any

  // Check product access — is_preview lessons bypass the purchase check
  if (profileData?.role !== 'admin' && !lessonData.is_preview) {
    const { data: access } = await supabase
      .from('user_product_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product?.id ?? '')
      .single()

    if (!access) return <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)' }}>You don&apos;t have access to this lesson.</div>

    // Check required tag
    if (lessonData.required_tag) {
      const userTags: string[] = profileData?.tags ?? []
      if (!userTags.includes(lessonData.required_tag)) {
        return <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)' }}>This lesson is not included in your plan.</div>
      }
    }
  }

  // Check completion
  const { data: completion } = await supabase
    .from('lesson_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', id)
    .single()

  // Log lesson view — skip in preview mode so admin previews don't pollute analytics
  if (!preview) {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      event_type: 'lesson_viewed',
      product_id: product?.id ?? null,
      module_id: mod?.id ?? null,
      lesson_id: lesson.id,
    })
  }

  // Fetch sibling lessons for prev/next nav
  const { data: siblingLessons } = await supabase
    .from('lessons')
    .select('id, title, sort_order')
    .eq('module_id', mod?.id)
    .order('sort_order')

  const currentIndex = (siblingLessons ?? []).findIndex((l) => l.id === id)
  const prevLesson = currentIndex > 0 ? siblingLessons![currentIndex - 1] : null
  const nextLesson = currentIndex < (siblingLessons?.length ?? 0) - 1 ? siblingLessons![currentIndex + 1] : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      {preview && (
        <div style={{ background: 'var(--si-burnt-orange)', color: 'white', padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem' }}>
          <span>👁 Preview mode — this is exactly what a student sees.</span>
          <Link href={`/admin/content/${product?.slug}`} style={{ color: 'white', fontWeight: 700, textDecoration: 'underline' }}>
            Exit preview
          </Link>
        </div>
      )}
      <NavBar email={profileData?.email ?? ''} role={profileData?.role ?? 'user'} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ color: 'var(--si-muted)', textDecoration: 'none' }}>Dashboard</Link>
          <span>›</span>
          <Link href={`/products/${product?.slug}${previewQS}`} style={{ color: 'var(--si-muted)', textDecoration: 'none' }}>{product?.title}</Link>
          <span>›</span>
          <span style={{ color: 'var(--si-dark-text)' }}>{mod?.title}</span>
        </div>

        {/* Lesson content */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--si-dark-text)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
            {lesson.title}
          </h1>
          {lesson.description && lesson.content_type !== 'video' && (
            <p style={{ color: 'var(--si-muted)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {lesson.description}
            </p>
          )}

          <LessonPlayer
            lessonId={lesson.id}
            contentType={lesson.content_type}
            contentUrl={lesson.content_url}
            userId={user.id}
            isCompleted={!!completion}
            productId={product?.id}
            moduleId={mod?.id}
            description={lesson.description}
          />
        </div>

        {/* Prev / Next navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          {prevLesson ? (
            <Link href={`/lessons/${prevLesson.id}${previewQS}`} style={{ textDecoration: 'none', flex: 1 }}>
              <div className="card" style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}>
                <div style={{ color: 'var(--si-muted)', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '0.25rem' }}>← Previous</div>
                <div style={{ color: 'var(--si-dark-text)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{prevLesson.title}</div>
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}

          {nextLesson ? (
            <Link href={`/lessons/${nextLesson.id}${previewQS}`} style={{ textDecoration: 'none', flex: 1 }}>
              <div className="card" style={{ padding: '1rem 1.25rem', cursor: 'pointer', textAlign: 'right' }}>
                <div style={{ color: 'var(--si-muted)', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '0.25rem' }}>Next →</div>
                <div style={{ color: 'var(--si-dark-text)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{nextLesson.title}</div>
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}
        </div>
      </div>
    </div>
  )
}
