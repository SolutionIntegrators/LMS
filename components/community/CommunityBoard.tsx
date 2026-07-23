'use client'

import { useEffect, useState } from 'react'
import ThreadList, { ThreadListItem } from './ThreadList'
import ThreadDetail, { ThreadDetailData } from './ThreadDetail'
import NewThreadForm from './NewThreadForm'
import {
  getThreadList, getThreadDetail, createThread, createReply, toggleThreadMute,
  toggleReaction, editThread, deleteThread, editReply, deleteReply,
} from '@/app/community/actions'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'thread'; id: string }

export default function CommunityBoard({
  productId,
  lessonId,
  initialThreads,
  initialThreadId,
}: {
  productId: string
  lessonId: string
  initialThreads: ThreadListItem[]
  initialThreadId: string | null
}) {
  const [threads, setThreads] = useState<ThreadListItem[]>(initialThreads)
  const [view, setView] = useState<View>(initialThreadId ? { mode: 'thread', id: initialThreadId } : { mode: 'list' })
  const [thread, setThread] = useState<ThreadDetailData | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)

  async function refreshList() {
    try {
      setThreads(await getThreadList(productId))
    } catch {
      // best-effort refresh; keep showing whatever we already have
    }
  }

  async function openThread(id: string) {
    setView({ mode: 'thread', id })
    setLoadingThread(true)
    setThreadError(null)
    try {
      setThread(await getThreadDetail(id))
    } catch (err) {
      setThread(null)
      setThreadError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      setLoadingThread(false)
    }
  }

  useEffect(() => {
    if (view.mode === 'thread') openThread(view.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleNewThread(title: string, body: string) {
    const fd = new FormData()
    fd.set('product_id', productId)
    fd.set('lesson_id', lessonId)
    fd.set('title', title)
    fd.set('body', body)
    fd.set('origin', window.location.origin)
    const { threadId } = await createThread(fd)
    await refreshList()
    await openThread(threadId)
  }

  async function handleReply(body: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('lesson_id', lessonId)
    fd.set('body', body)
    fd.set('origin', window.location.origin)
    await createReply(fd)
    await Promise.all([refreshList(), openThread(view.id)])
  }

  async function handleToggleMute(mute: boolean) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('mute', String(mute))
    await toggleThreadMute(fd)
    setThread((prev) => (prev ? { ...prev, isMuted: mute } : prev))
  }

  async function handleReact(emoji: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('emoji', emoji)
    await toggleReaction(fd)
    await openThread(view.id)
  }

  async function handleReactReply(replyId: string, emoji: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('reply_id', replyId)
    fd.set('emoji', emoji)
    await toggleReaction(fd)
    await openThread(view.id)
  }

  async function handleEditThread(title: string, body: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('title', title)
    fd.set('body', body)
    fd.set('lesson_id', lessonId)
    await editThread(fd)
    await Promise.all([refreshList(), openThread(view.id)])
  }

  async function handleDeleteThread() {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('lesson_id', lessonId)
    await deleteThread(fd)
    await refreshList()
    setView({ mode: 'list' })
  }

  async function handleEditReply(replyId: string, body: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('reply_id', replyId)
    fd.set('body', body)
    fd.set('lesson_id', lessonId)
    await editReply(fd)
    await openThread(view.id)
  }

  async function handleDeleteReply(replyId: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('reply_id', replyId)
    fd.set('lesson_id', lessonId)
    await deleteReply(fd)
    await Promise.all([refreshList(), openThread(view.id)])
  }

  if (view.mode === 'new') {
    return <NewThreadForm onSubmit={handleNewThread} onCancel={() => setView({ mode: 'list' })} />
  }

  if (view.mode === 'thread') {
    if (loadingThread) {
      return <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)' }}>Loading…</p>
    }
    if (!thread) {
      return (
        <div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#8B2A1A' }}>{threadError || 'Failed to load thread.'}</p>
          <button type="button" onClick={() => setView({ mode: 'list' })} style={{ background: 'transparent', border: 'none', color: 'var(--si-burnt-orange)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '0.5rem' }}>
            ← Back to all threads
          </button>
        </div>
      )
    }
    return (
      <ThreadDetail
        thread={thread}
        onBack={() => setView({ mode: 'list' })}
        onReply={handleReply}
        onToggleMute={handleToggleMute}
        onReact={handleReact}
        onReactReply={handleReactReply}
        onEditThread={handleEditThread}
        onDeleteThread={handleDeleteThread}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
      />
    )
  }

  return <ThreadList threads={threads} onOpen={openThread} onNewThread={() => setView({ mode: 'new' })} />
}
