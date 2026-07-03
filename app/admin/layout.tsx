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
      <html><body>
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/login')` }} />
      </body></html>
    )
  }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { email: string; role: string } | null

  if (!profile || profile.role !== 'admin') {
    return (
      <html><body>
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/dashboard')` }} />
      </body></html>
    )
  }

  const navItems = [
    { href: '/admin/content', label: 'Content' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/logs', label: 'Activity Logs' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)' }}>
      <NavBar email={profile.email} role="admin" />
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
