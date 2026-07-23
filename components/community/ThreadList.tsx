'use client'

export interface ThreadListItem {
  id: string
  title: string
  isPinned: boolean
  createdAt: string
  lastActivity: string
  authorName: string
  replyCount: number
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ThreadList({
  threads,
  onOpen,
  onNewThread,
}: {
  threads: ThreadListItem[]
  onOpen: (threadId: string) => void
  onNewThread: () => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button type="button" className="btn-primary" onClick={onNewThread}>+ New thread</button>
      </div>

      {threads.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--si-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            No threads yet — be the first to start a conversation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen(t.id)}
              className="card"
              style={{
                padding: '1rem 1.25rem', textAlign: 'left', cursor: 'pointer', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t.isPinned && <span title="Pinned">📌</span>}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--si-dark-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.title}
                  </span>
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', marginTop: '0.25rem' }}>
                  {t.authorName} · {timeAgo(t.lastActivity)}
                </div>
              </div>
              <div style={{ flexShrink: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '0.8125rem', color: 'var(--si-muted)', textAlign: 'right' }}>
                {t.replyCount} repl{t.replyCount === 1 ? 'y' : 'ies'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
