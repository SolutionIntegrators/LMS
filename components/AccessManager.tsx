'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Product { id: string; title: string; slug: string }

export default function AccessManager({ products }: { products: Product[] }) {
  const [email, setEmail] = useState('')
  const [productId, setProductId] = useState('')
  const [action, setAction] = useState<'grant' | 'revoke'>('grant')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Look up user by email via profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!profile) {
      setMessage({ type: 'error', text: `No user found with email: ${email}` })
      setLoading(false)
      return
    }

    if (action === 'grant') {
      const { error } = await supabase.from('user_product_access').insert({
        user_id: profile.id,
        product_id: productId,
        granted_by: 'admin',
      })
      if (error && error.code !== '23505') {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: `Access granted to ${email}` })
        setEmail('')
      }
    } else {
      const { error } = await supabase
        .from('user_product_access')
        .delete()
        .eq('user_id', profile.id)
        .eq('product_id', productId)
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: `Access revoked for ${email}` })
        setEmail('')
      }
    }

    setLoading(false)
  }

  const inputStyle = {
    border: '1.5px solid var(--si-border)',
    borderRadius: 'var(--si-radius-sm)',
    padding: '0.75rem 1rem',
    fontSize: '0.9375rem',
    color: 'var(--si-dark-text)',
    background: 'var(--si-white)',
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div className="card">
      <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-dark-text)', marginBottom: '1.25rem' }}>
        Grant or revoke access
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Grant / Revoke toggle */}
        <div style={{ display: 'flex', background: 'var(--si-linen)', borderRadius: 'var(--si-radius-sm)', padding: 4 }}>
          {(['grant', 'revoke'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 6, border: 'none',
                background: action === a ? 'var(--si-white)' : 'transparent',
                color: action === a ? (a === 'grant' ? 'var(--si-burnt-orange)' : '#8B2A1A') : 'var(--si-muted)',
                fontFamily: 'DM Sans, sans-serif', fontWeight: action === a ? 600 : 400, fontSize: '0.875rem',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: action === a ? 'var(--si-shadow-soft)' : 'none',
              }}
            >
              {a === 'grant' ? 'Grant access' : 'Revoke access'}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>User email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" style={inputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: 'var(--si-dark-text)' }}>Program</span>
          <select required value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
            <option value="">Select a program…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
          {loading ? 'Saving…' : action === 'grant' ? 'Grant access' : 'Revoke access'}
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
  )
}
