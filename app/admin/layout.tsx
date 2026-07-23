export const runtime = 'edge'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import NavBar from '@/components/NavBar'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware handles unauthenticated → /login, but guard here too
  if (!user) {
    return (
      <div>
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/login')` }} />
      </div>
    )
  }

  // Cast: avatar_url is newer than the generated DB types.
  const { data: profileRaw } = await (supabase as any)
    .from('profiles')
    .select('email, role, avatar_url')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { email: string; role: string; avatar_url: string | null } | null

  if (!profile || profile.role !== 'admin') {
    return (
      <div>
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/dashboard')` }} />
      </div>
    )
  }

  const navItems = [
    { href: '/admin/content', label: 'Content' },
    { href: '/admin/people', label: 'People' },
    { href: '/admin/support', label: 'Support Requests' },
    { href: '/admin/logs', label: 'Activity Logs' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar email={profile.email} role="admin" avatarUrl={profile.avatar_url ?? null} />
      <div style={{ borderBottom: '1px solid var(--si-border)', background: 'var(--si-white)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={{
              padding: '0.875rem 1rem',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              color: 'var(--si-denim-blue)',
              textDecoration: 'none',
              borderBottom: '2px solid transparent',
              transition: 'color 0.2s',
            }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
