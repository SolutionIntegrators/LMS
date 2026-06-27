import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', user.id)
    .single()

  // Verify access
  const { data: product } = await supabase
    .from('products')
    .select('id, title, slug, description, cover_image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()


  if (!product) notFound()

  const { data: access } = await supabase
    .from('user_product_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product.id)
    .single()

  if (!access && profile?.role !== 'admin') notFound()

  // Fetch modules with lessons
  const { data: modules } = await supabase
    .from('modules')
    .select(`
      id, title, description, sort_order,
      lessons (id, title, content_type, sort_order, is_preview)
    `)
    .eq('product_id', product.id)
    .order('sort_order')

  // Fetch completions
  const { data: completions } = await supabase
    .from('lesson_completions')
    .select('lesson_id')
    .eq('user_id', user.id)

  const completedIds = new Set((completions ?? []).map((c) => c.lesson_id))

  const totalLessons = (modules ?? []).reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)
  const completedCount = (modules ?? []).flatMap((m) => m.lessons ?? []).filter((l) => completedIds.has(l.id)).length
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  // Log product access
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    event_type: 'product_accessed',
    product_id: product.id,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar email={profile?.email ?? ''} role={profile?.role ?? 'user'} />

      {/* Hero */}
      <div style={{ background: 'var(--si-denim-blue)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ color: 'rgba(252,241,232,0.6)', fontSize: '0.875rem', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
            ← Back to dashboard
          </Link>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 400, color: 'var(--si-linen)', marginTop: '1rem', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            {product.title}
          </h1>
          {product.description && (
            <p style={{ color: 'rgba(252,241,232,0.75)', fontSize: '1rem', maxWidth: 600, lineHeight: 1.7 }}>
              {product.description}
            </p>
          )}

          {/* Progress bar */}
          <div style={{ marginTop: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(252,241,232,0.7)', fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif' }}>
                Your progress
              </span>
              <span style={{ color: 'var(--si-linen)', fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                {completedCount}/{totalLessons} lessons · {progressPct}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 100 }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--si-burnt-orange)', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(modules ?? []).map((mod, modIndex) => {
            const lessons = [...(mod.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const modCompleted = lessons.filter((l) => completedIds.has(l.id)).length
            return (
              <div key={mod.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Module header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--si-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--si-linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--si-denim-blue)', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {modIndex + 1}
                    </div>
                    <div>
                      <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-dark-text)', marginBottom: 2 }}>
                        {mod.title}
                      </h2>
                      {mod.description && (
                        <p style={{ color: 'var(--si-muted)', fontSize: '0.8125rem' }}>{mod.description}</p>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--si-muted)', fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {modCompleted}/{lessons.length}
                  </span>
                </div>

                {/* Lessons */}
                {lessons.map((lesson, i) => {
                  const done = completedIds.has(lesson.id)
                  return (
                    <Link key={lesson.id} href={`/lessons/${lesson.id}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{
                          padding: '1rem 1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          borderBottom: i < lessons.length - 1 ? '1px solid var(--si-border)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Completion dot */}
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: done ? 'var(--si-burnt-orange)' : 'transparent',
                          border: `2px solid ${done ? 'var(--si-burnt-orange)' : 'var(--si-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {done && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                        </div>

                        <div style={{ flex: 1 }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--si-dark-text)' }}>
                            {lesson.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {lesson.is_preview && (
                            <span style={{ background: 'var(--si-linen-dark)', color: 'var(--si-denim-blue)', fontSize: '0.7rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                              Preview
                            </span>
                          )}
                          <ContentTypeIcon type={lesson.content_type} />
                          <span style={{ color: 'var(--si-muted)', fontSize: '0.875rem' }}>→</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function ContentTypeIcon({ type }: { type: string | null }) {
  const icons: Record<string, string> = {
    video: '▶',
    pdf: '📄',
    download: '⬇',
    text: '📝',
    embed: '🔗',
  }
  return (
    <span style={{ color: 'var(--si-muted)', fontSize: '0.875rem' }}>
      {icons[type ?? ''] ?? '📄'}
    </span>
  )
}
