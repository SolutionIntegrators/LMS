'use client'

import { useState } from 'react'
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

const linkStyle: React.CSSProperties = {
  color: 'var(--si-linen)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.875rem',
  fontWeight: 500,
  textDecoration: 'none',
  letterSpacing: '0.03em',
}

const highlightLinkStyle: React.CSSProperties = { ...linkStyle, color: 'var(--si-sunset-yellow)' }

export default function NavBar({ email, role, avatarUrl }: NavBarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatar = (
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
  )

  return (
    <nav
      style={{
        background: 'var(--si-denim-blue)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src={branding.logo.navBadge}
            alt={branding.company}
            width={44}
            height={44}
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>

        {/* Desktop links — hidden on narrow screens (see .nav-links-desktop in globals.css) */}
        <div className="nav-links-desktop" style={{ alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/support" style={linkStyle}>Support</Link>
          {branding.links.affiliate && (
            <a href={branding.links.affiliate} target="_blank" rel="noopener noreferrer" style={highlightLinkStyle}>
              Become an affiliate
            </a>
          )}
          {role === 'admin' && (
            <Link href="/admin/people" style={highlightLinkStyle}>Admin</Link>
          )}
          <Link href="/profile" title="My Profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            {avatar}
            <span style={{ color: 'rgba(252,241,232,0.6)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </span>
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'var(--si-linen)', border: 'none', borderRadius: 6,
              padding: '0.375rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', fontWeight: 500,
              cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            Sign out
          </button>
        </div>

        {/* Mobile: just the avatar (→ profile) + a hamburger for everything else */}
        <div className="nav-mobile-controls" style={{ alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/profile" title="My Profile" style={{ display: 'flex' }}>{avatar}</Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontSize: '1.25rem', lineHeight: 1 }}>{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div
          className="nav-mobile-controls"
          style={{
            flexDirection: 'column', alignItems: 'stretch', gap: 0,
            background: 'var(--si-denim-blue)', borderTop: '1px solid rgba(255,255,255,0.12)',
            padding: '0.5rem 1rem 1rem',
          }}
        >
          <span style={{ color: 'rgba(252,241,232,0.6)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', padding: '0.625rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </span>
          <Link href="/support" style={{ ...linkStyle, padding: '0.625rem 0' }} onClick={() => setMenuOpen(false)}>Support</Link>
          {branding.links.affiliate && (
            <a href={branding.links.affiliate} target="_blank" rel="noopener noreferrer" style={{ ...highlightLinkStyle, padding: '0.625rem 0' }}>
              Become an affiliate
            </a>
          )}
          {role === 'admin' && (
            <Link href="/admin/people" style={{ ...highlightLinkStyle, padding: '0.625rem 0' }} onClick={() => setMenuOpen(false)}>Admin</Link>
          )}
          <Link href="/profile" style={{ ...linkStyle, padding: '0.625rem 0' }} onClick={() => setMenuOpen(false)}>My Profile</Link>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'var(--si-linen)', border: 'none', borderRadius: 6,
              padding: '0.625rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', marginTop: '0.5rem', textAlign: 'left',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
