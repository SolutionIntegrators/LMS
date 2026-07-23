'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { branding } from '@/lib/branding'

interface NavBarProps {
  email: string
  role: string
  avatarUrl?: string | null
}

export default function NavBar({ email, role, avatarUrl }: NavBarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav
      style={{
        background: 'var(--si-denim-blue)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <Image
          src={branding.logo.navBadge}
          alt={branding.company}
          width={48}
          height={48}
          style={{ objectFit: 'contain' }}
          priority
        />
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link
          href="/support"
          style={{
            color: 'var(--si-linen)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '0.03em',
          }}
        >
          Support
        </Link>
        {branding.links.affiliate && (
          <a
            href={branding.links.affiliate}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--si-sunset-yellow)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.03em',
            }}
          >
            Become an affiliate
          </a>
        )}
        {role === 'admin' && (
          <Link
            href="/admin/users"
            style={{
              color: 'var(--si-sunset-yellow)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.03em',
            }}
          >
            Admin
          </Link>
        )}
        <Link
          href="/profile"
          title="My Profile"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}>{(email[0] || '?').toUpperCase()}</span>
            )}
          </div>
          <span
            style={{
              color: 'rgba(252,241,232,0.6)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.875rem',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--si-linen)',
            border: 'none',
            borderRadius: 6,
            padding: '0.375rem 0.875rem',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
