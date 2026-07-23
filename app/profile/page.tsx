export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import ProfileForm from '@/components/profile/ProfileForm'
import NotificationPreferences from '@/components/profile/NotificationPreferences'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware handles redirect to /login

  const { data: profile } = await (supabase as any)
    .from('profiles').select('full_name, email, role, avatar_url').eq('id', user.id).single()

  // Products this user is subscribed/unsubscribed to for community notifications.
  const { data: subs } = await (supabase as any)
    .from('community_subscriptions')
    .select('product_id, subscribed, products(title)')
    .eq('user_id', user.id)

  // Only show products that actually have a community board (RLS already
  // scopes this to lessons the user can see, i.e. products they own).
  const { data: communityLessons } = await (supabase as any)
    .from('lessons')
    .select('modules!inner(product_id)')
    .eq('content_type', 'community')
  const communityProductIds = new Set(
    (communityLessons ?? []).map((l: any) => l.modules?.product_id).filter(Boolean)
  )

  const subscriptions = (subs ?? [])
    .filter((s: any) => communityProductIds.has(s.product_id))
    .map((s: any) => ({
      productId: s.product_id,
      productTitle: s.products?.title || 'Course',
      subscribed: s.subscribed,
    }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar
        email={profile?.email ?? user.email ?? ''}
        role={profile?.role ?? 'user'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '2rem', color: 'var(--si-denim-blue)', marginBottom: '2rem' }}>
          My Profile
        </h1>

        <ProfileForm
          userId={user.id}
          fullName={profile?.full_name ?? ''}
          email={profile?.email ?? user.email ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
        />

        {subscriptions.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: 'var(--si-denim-blue)', marginBottom: '1rem' }}>
              Community notifications
            </h2>
            <NotificationPreferences subscriptions={subscriptions} />
          </div>
        )}
      </main>
    </div>
  )
}
