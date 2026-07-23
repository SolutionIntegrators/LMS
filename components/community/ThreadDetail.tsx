'use client'

import { useState } from 'react'

export interface ThreadDetailData {
  id: string
  title: string
  body: string
  createdAt: string
  authorName: string
  isMuted: boolean
  replies: Array<{ id: string; body: string; createdAt: string; authorName: string }>
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--si-border)',
  borderRadius: 'var(--si-radius-sm)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9rem',
  color: 'var(--si-dark-text)',
  background: 'var(--si-white)',
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
  resize: 'vertical' as const,
}

export default function ThreadDetail({
  thread,
  onBack,
  onReply,
  onToggleMute,
}: {
  thread: ThreadDetailData
  onBack: () => void
  onReply: (body: string) => Promise<void>
  onToggleMute: (mute: boolean) => Promise<void>
}) {
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [muting, setMuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onReply(replyBody.trim())
      setReplyBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reply')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMute() {
    setMuting(true)
    try {
      await onToggleMute(!thread.isMuted)
    } finally {
      setMuting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button type="button" onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--si-burnt-orange)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}>
          ← Back to all threads
        </button>
        <button
          type="button"
          onClick={handleMute}
          disabled={muting}
          title={thread.isMuted ? 'Unmute this thread' : 'Mute this thread'}
          style={{
            background: thread.isMuted ? 'var(--si-linen)' : 'transparent',
            border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)',
            padding: '0.4rem 0.875rem', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', fontWeight: 500,
            color: 'var(--si-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          {thread.isMuted ? '🔕 Muted' : '🔔 Notifications on'}
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.35rem', color: 'var(--si-dark-text)', marginBottom: '0.5rem' }}>{thread.title}</h2>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginBottom: '1rem' }}>
          {thread.authorName} · {new Date(thread.createdAt).toLocaleString()}
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--si-dark-text)', whiteSpace: 'pre-wrap' }}>{thread.body}</p>
      </div>

      {thread.replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', paddingLeft: '1.5rem' }}>
          {thread.replies.map((r) => (
            <div key={r.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginBottom: '0.375rem' }}>
                {r.authorName} · {new Date(r.createdAt).toLocaleString()}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--si-dark-text)', whiteSpace: 'pre-wrap' }}>{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleReply} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={3} placeholder="Write a reply…" required style={inputStyle} />
        {error && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>{error}</span>}
        <div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Posting…' : 'Reply'}</button>
        </div>
      </form>
    </div>
  )
}
