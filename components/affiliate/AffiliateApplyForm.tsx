'use client'

import { useState } from 'react'
import { submitAffiliateApplication } from '@/app/affiliate-apply/actions'
import { branding } from '@/lib/branding'

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
}
const lbl: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--si-muted)',
  marginBottom: '0.375rem',
}
const readonlyBox: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--si-linen)',
  color: 'var(--si-muted)',
}

export default function AffiliateApplyForm({
  fullName,
  email,
  products,
}: {
  fullName: string
  email: string
  products: Array<{ id: string; title: string }>
}) {
  const [businessName, setBusinessName] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<'created' | 'already_exists' | null>(null)

  function toggleProduct(title: string) {
    setSelectedProducts((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('You must agree to the Affiliate Program terms to apply')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('business_name', businessName)
      fd.set('paypal_email', paypalEmail)
      fd.set('agree_terms', agreed ? 'true' : 'false')
      selectedProducts.forEach((title) => fd.append('products', title))
      const res = await submitAffiliateApplication(fd)
      setResult(res.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (result === 'created') {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem', color: 'var(--si-dark-text)', margin: 0 }}>
          Thanks{fullName ? `, ${fullName}` : ''}! Your affiliate application has been submitted — we&apos;ll be in touch once it&apos;s reviewed.
        </p>
      </div>
    )
  }
  if (result === 'already_exists') {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem', color: 'var(--si-dark-text)', margin: 0 }}>
          Looks like you&apos;ve already applied, or you&apos;re already one of our partners — reach out to support if you need help with your affiliate account.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <span style={lbl}>Name</span>
          <div style={readonlyBox}>{fullName || '—'}</div>
        </div>
        <div>
          <span style={lbl}>Email</span>
          <div style={readonlyBox}>{email}</div>
        </div>
      </div>

      <label>
        <span style={lbl}>Business Name</span>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. RP Digital Studio" style={inputStyle} />
      </label>

      <label>
        <span style={lbl}>PayPal Email (for commission payouts)</span>
        <input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="you@paypal.com" style={inputStyle} />
      </label>

      <div>
        <span style={lbl}>Which offer(s) would you like a link for?</span>
        {products.length === 0 ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-muted)', margin: 0 }}>No offers are available for affiliate links right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {products.map((p) => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', color: 'var(--si-dark-text)' }}>
                <input type="checkbox" checked={selectedProducts.includes(p.title)} onChange={() => toggleProduct(p.title)} />
                {p.title}
              </label>
            ))}
          </div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: 'var(--si-dark-text)' }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: '0.2rem' }} />
        <span>
          I agree to the{' '}
          <a href={branding.links.terms} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--si-denim-blue)' }}>
            Terms and Conditions
          </a>{' '}
          of the {branding.company} Affiliate Program
        </span>
      </label>

      {error && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A', margin: 0 }}>{error}</p>}

      <div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
    </form>
  )
}
