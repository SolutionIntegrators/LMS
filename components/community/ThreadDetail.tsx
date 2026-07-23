'use client'

import { useState } from 'react'
import { mdBlock } from '@/lib/markdown'
import { REACTION_EMOJIS, type ReactionSummary } from '@/lib/reactions'

export interface ThreadDetailData {
  id: string
  title: string
  body: string
  createdAt: string
  authorName: string
  isAuthor: boolean
  isMuted: boolean
  reactions: ReactionSummary[]
  replies: Array<{ id: string; body: string; createdAt: string; authorName: string; isAuthor: boolean; reactions: ReactionSummary[] }>
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

const formatHint = 'Supports **bold**, *italic*, [links](https://…), and "- " for bullets.'

function ReactionRow({
  reactions,
  onReact,
}: {
  reactions: ReactionSummary[]
  onReact: (emoji: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
      {REACTION_EMOJIS.map((emoji) => {
        const r = reactions.find((x) => x.emoji === emoji)
        const count = r?.count ?? 0
        const mine = r?.reactedByMe ?? false
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: mine ? 'var(--si-linen)' : 'transparent',
              border: `1.5px solid ${mine ? 'var(--si-burnt-orange)' : 'var(--si-border)'}`,
              borderRadius: 999, padding: '0.15rem 0.55rem', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', lineHeight: 1.6,
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ color: 'var(--si-muted)' }}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function ThreadDetail({
  thread,
  onBack,
  onReply,
  onToggleMute,
  onReact,
  onReactReply,
  onEditThread,
  onDeleteThread,
  onEditReply,
  onDeleteReply,
}: {
  thread: ThreadDetailData
  onBack: () => void
  onReply: (body: string) => Promise<void>
  onToggleMute: (mute: boolean) => Promise<void>
  onReact: (emoji: string) => Promise<void>
  onReactReply: (replyId: string, emoji: string) => Promise<void>
  onEditThread: (title: string, body: string) => Promise<void>
  onDeleteThread: () => Promise<void>
  onEditReply: (replyId: string, body: string) => Promise<void>
  onDeleteReply: (replyId: string) => Promise<void>
}) {
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [muting, setMuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingThread, setEditingThread] = useState(false)
  const [editTitle, setEditTitle] = useState(thread.title)
  const [editBody, setEditBody] = useState(thread.body)
  const [savingThread, setSavingThread] = useState(false)

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyBody, setEditReplyBody] = useState('')
  const [savingReply, setSavingReply] = useState(false)

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

  async function handleSaveThread() {
    if (!editTitle.trim() || !editBody.trim() || savingThread) return
    setSavingThread(true)
    try {
      await onEditThread(editTitle.trim(), editBody.trim())
      setEditingThread(false)
    } finally {
      setSavingThread(false)
    }
  }

  async function handleDeleteThread() {
    if (!confirm('Delete this thread and all its replies? This cannot be undone.')) return
    await onDeleteThread()
  }

  function startEditReply(replyId: string, currentBody: string) {
    setEditingReplyId(replyId)
    setEditReplyBody(currentBody)
  }

  async function handleSaveReply(replyId: string) {
    if (!editReplyBody.trim() || savingReply) return
    setSavingReply(true)
    try {
      await onEditReply(replyId, editReplyBody.trim())
      setEditingReplyId(null)
    } finally {
      setSavingReply(false)
    }
  }

  async function handleDeleteReply(replyId: string) {
    if (!confirm('Delete this reply? This cannot be undone.')) return
    await onDeleteReply(replyId)
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
        {editingThread ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle} />
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5} style={inputStyle} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>{formatHint}</span>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button type="button" className="btn-primary" disabled={savingThread} onClick={handleSaveThread}>
                {savingThread ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setEditingThread(false); setEditTitle(thread.title); setEditBody(thread.body) }}
                style={{ background: 'transparent', border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.625rem 1.25rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.35rem', color: 'var(--si-dark-text)', marginBottom: '0.5rem' }}>{thread.title}</h2>
              {thread.isAuthor && (
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => setEditingThread(true)} style={{ background: 'transparent', border: 'none', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', cursor: 'pointer' }}>Edit</button>
                  <button type="button" onClick={handleDeleteThread} style={{ background: 'transparent', border: 'none', color: '#8B2A1A', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', cursor: 'pointer' }}>Delete</button>
                </div>
              )}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginBottom: '1rem' }}>
              {thread.authorName} · {new Date(thread.createdAt).toLocaleString()}
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--si-dark-text)' }}
              dangerouslySetInnerHTML={{ __html: mdBlock(thread.body) }} />
            <ReactionRow reactions={thread.reactions} onReact={onReact} />
          </>
        )}
      </div>

      {thread.replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', paddingLeft: '1.5rem' }}>
          {thread.replies.map((r) => (
            <div key={r.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              {editingReplyId === r.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea value={editReplyBody} onChange={(e) => setEditReplyBody(e.target.value)} rows={3} style={inputStyle} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>{formatHint}</span>
                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    <button type="button" className="btn-primary" disabled={savingReply} onClick={() => handleSaveReply(r.id)}>
                      {savingReply ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingReplyId(null)}
                      style={{ background: 'transparent', border: '1.5px solid var(--si-border)', borderRadius: 'var(--si-radius-sm)', padding: '0.5rem 1rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginBottom: '0.375rem' }}>
                      {r.authorName} · {new Date(r.createdAt).toLocaleString()}
                    </div>
                    {r.isAuthor && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button type="button" onClick={() => startEditReply(r.id, r.body)} style={{ background: 'transparent', border: 'none', color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                        <button type="button" onClick={() => handleDeleteReply(r.id)} style={{ background: 'transparent', border: 'none', color: '#8B2A1A', fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--si-dark-text)' }}
                    dangerouslySetInnerHTML={{ __html: mdBlock(r.body) }} />
                  <ReactionRow reactions={r.reactions} onReact={(emoji) => onReactReply(r.id, emoji)} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleReply} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={3} placeholder="Write a reply…" required style={inputStyle} />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: 'var(--si-muted)' }}>{formatHint}</span>
        {error && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#8B2A1A' }}>{error}</span>}
        <div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Posting…' : 'Reply'}</button>
        </div>
      </form>
    </div>
  )
}
