'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Could not update your password. Your reset link may have expired — request a new one.' })
    } else {
      setMessage({ type: 'success', text: 'Password updated! Taking you to your dashboard…' })
      setTimeout(() => { window.location.href = '/dashboard' }, 1200)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)',
    padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--si-dark-text)',
    background: 'var(--si-white)', width: '100%', fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--si-linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.6rem', color: 'var(--si-denim-blue)', marginBottom: '0.5rem' }}>
          Set a new password
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Choose a new password for your Goodies Shop account.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" style={inputStyle} autoComplete="new-password" />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" style={inputStyle} autoComplete="new-password" />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
          {message && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--si-radius-sm)',
              background: message.type === 'success' ? '#EDF7F0' : '#FDF0EE',
              color: message.type === 'success' ? '#1A6B3C' : '#8B2A1A',
              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
            }}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
