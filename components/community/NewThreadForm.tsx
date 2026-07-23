'use client'

import { useState } from 'react'
import MarkdownEditor from './MarkdownEditor'

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

export default function NewThreadForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, body: string) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(title.trim(), body.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--si-denim-blue)' }}>New thread</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" required style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 500, color: 'var(--si-muted)' }}>Details</span>
        <MarkdownEditor value={body} onChange={setBody} placeholder="Ask a question, share a link…" rows={5} />
      </label>
      {error && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>{error}</span>}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Posting…' : 'Post thread'}</button>
        <button type="button" onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 1.25rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: 'var(--si-muted)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
