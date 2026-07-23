'use client'

import { useState } from 'react'
import { submitTicket } from '@/app/support/actions'

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

export default function SupportForm({
  products,
  onSubmitted,
}: {
  products: Array<{ slug: string; title: string }>
  onSubmitted: () => void
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !description.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('subject', subject.trim())
      fd.set('description', description.trim())
      fd.set('product_slug', productSlug)
      await submitTicket(fd)
      setSubject('')
      setDescription('')
      setProductSlug('')
      setDone(true)
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: 'var(--si-denim-blue)', margin: 0 }}>
        Submit a request
      </h2>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" required style={inputStyle} />
      </label>

      {products.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Which course? (optional)</span>
          <select value={productSlug} onChange={(e) => setProductSlug(e.target.value)} style={inputStyle}>
            <option value="">Not course-specific</option>
            {products.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
        </label>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Details</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} required style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      {error && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>{error}</span>}
      {done && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#1A6B3C' }}>Submitted ✓ — see it below.</span>}

      <div>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
      </div>
    </form>
  )
}
