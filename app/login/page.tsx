'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { createOtpClient } from '@/lib/supabase-otp'
import Image from 'next/image'

type Mode = 'magic' | 'password'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // SSR client for password sign-in (persists the session as cookies).
  const supabase = createClient()
  // Implicit-flow client for email links (magic link / reset) so they carry
  // a cross-device OTP token instead of a browser-bound PKCE token.
  const otp = createOtpClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await otp.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email — we sent you a magic link to sign in.',
      })
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      window.location.href = '/dashboard'
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessage({ type: 'error', text: 'Enter your email above first, then click “Forgot password?”' })
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await otp.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    setMessage(
      error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: 'Check your email — we sent you a link to reset your password.' }
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--si-denim-blue)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(163,79,43,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 20% 80%, rgba(210,135,51,0.12) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }}
      />

      <div className="card" style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1, padding: '2.75rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Image
            src="/SI-primary-logo-orange.png"
            alt="Solution Integrators"
            width={200}
            height={80}
            style={{ objectFit: 'contain', margin: '0 auto 0.75rem' }}
            priority
          />
          <p style={{ color: 'var(--si-muted)', fontSize: '0.875rem' }}>
            Welcome to the Solution Integrators Goodies Shop
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--si-linen)',
            borderRadius: 'var(--si-radius-sm)',
            padding: 4,
            marginBottom: '1.75rem',
          }}
        >
          {(['magic', 'password'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 6,
                border: 'none',
                background: mode === m ? 'var(--si-white)' : 'transparent',
                color: mode === m ? 'var(--si-burnt-orange)' : 'var(--si-muted)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: mode === m ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: mode === m ? 'var(--si-shadow-soft)' : 'none',
              }}
            >
              {m === 'magic' ? 'Magic Link' : 'Password'}
            </button>
          ))}
        </div>

        {mode === 'magic' ? (
          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  border: '1.5px solid var(--si-border)',
                  borderRadius: 'var(--si-radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  color: 'var(--si-dark-text)',
                  background: 'var(--si-white)',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  border: '1.5px solid var(--si-border)',
                  borderRadius: 'var(--si-radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  color: 'var(--si-dark-text)',
                  background: 'var(--si-white)',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  border: '1.5px solid var(--si-border)',
                  borderRadius: 'var(--si-radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  color: 'var(--si-dark-text)',
                  background: 'var(--si-white)',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--si-burnt-orange)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'center', marginTop: '0.25rem' }}
            >
              Forgot password?
            </button>
          </form>
        )}

        {message && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--si-radius-sm)',
              background: message.type === 'success' ? '#EDF7F0' : '#FDF0EE',
              color: message.type === 'success' ? '#1A6B3C' : '#8B2A1A',
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {message.text}
          </div>
        )}

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--si-muted)' }}>
          Access is granted automatically after purchase.
        </p>
      </div>
    </div>
  )
}
