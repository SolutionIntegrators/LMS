import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import NavBar from '@/components/NavBar'
import LessonPlayer from '@/components/LessonPlayer'
import Link from 'next/link'

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', user.id)
    .single()

  // Fetch lesson with module and product
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      id, title, description, content_type, content_url, sort_order, is_preview,
      modules (
        id, title, product_id,
        products (id, title, slug)
      )
    `)
    .eq('id', id)
    .single()

  if (!lesson) notFound()

  const mod = lesson.modules as any
  const product = mod?.products as any

  // Check access (preview lessons are open to all authenticated users)
  if (!lesson.is_preview && profile?.role !== 'admin') {
    const { data: access } = await supabase
      .from('user_product_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product?.id)
      .single()

    if (!access) notFound()
  }

  // Check completion
  const { data: completion } = await supabase
    .from('lesson_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('lesson_id', id)
    .single()

  // Log lesson view
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    event_type: 'lesson_viewed',
    product_id: product?.id ?? null,
    module_id: mod?.id ?? null,
    lesson_id: lesson.id,
  })

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
      <NavBar email={profile?.email ?? ''} role={profile?.role ?? 'user'} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: 'var(--si-muted)', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ color: 'var(--si-muted)', textDecoration: 'none' }}>Dashboard</Link>
          <span>›</span>
          <Link href={`/products/${product?.slug}`} style={{ color: 'var(--si-muted)', textDecoration: 'none' }}>{product?.title}</Link>
          <span>›</span>
          <span style={{ color: 'var(--si-dark-text)' }}>{mod?.title}</span>
        </div>

        {/* Lesson content */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--si-dark-text)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
            {lesson.title}
          </h1>
          {lesson.description && (
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
          />
        </div>

        {/* Prev / Next navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          {prevLesson ? (
            <Link href={`/lessons/${prevLesson.id}`} style={{ textDecoration: 'none', flex: 1 }}>
              <div className="card" style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}>
                <div style={{ color: 'var(--si-muted)', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '0.25rem' }}>← Previous</div>
                <div style={{ color: 'var(--si-dark-text)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{prevLesson.title}</div>
              </div>
            </Link>
          ) : <div style={{ flex: 1 }} />}

          {nextLesson ? (
            <Link href={`/lessons/${nextLesson.id}`} style={{ textDecoration: 'none', flex: 1 }}>
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
